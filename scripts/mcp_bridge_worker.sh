#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Vahla MultiClaw - MCP Low-Level Bridge Worker
# Architecture: X86_64 / ARM64 Hybrid
# Protocol: JSON-RPC 2.0 over Unix Socket

readonly SOCKET_PATH="/tmp/mcp_apple_bridge.sock"
readonly MAX_RETRIES=5
readonly TIMEOUT_SEC=10
readonly LOG_FACILITY="local0"

declare -g STATE="INIT"
declare -g SESSION_TOKEN=""

log_event() {
    local level="$1"
    local message="$2"
    local ts
    ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    printf '{"timestamp":"%s","level":"%s","module":"mcp_worker","message":"%s"}\n' "$ts" "$level" "$message"
    logger -p "${LOG_FACILITY}.${level}" -t mcp_worker "$message"
}

verify_socket() {
    if [[ ! -S "$SOCKET_PATH" ]]; then
        log_event "err" "Socket not found at $SOCKET_PATH"
        return 1
    fi
    if [[ ! -w "$SOCKET_PATH" || ! -r "$SOCKET_PATH" ]]; then
        log_event "err" "Insufficient socket permissions"
        return 1
    fi
    return 0
}

generate_rpc_id() {
    head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n'
}

send_rpc_request() {
    local method="$1"
    local params="$2"
    local rpc_id
    rpc_id=$(generate_rpc_id)
    
    local payload
    payload=$(printf '{"jsonrpc":"2.0","method":"%s","params":%s,"id":"%s"}\n' "$method" "$params" "$rpc_id")
    
    log_event "debug" "TX: $payload"
    
    # Send payload to socket and capture response with timeout
    local response
    response=$(echo "$payload" | socat -t "$TIMEOUT_SEC" - UNIX-CONNECT:"$SOCKET_PATH" 2>/dev/null || true)
    
    if [[ -z "$response" ]]; then
        log_event "err" "RPC timeout or connection refused for method $method"
        return 1
    fi
    
    log_event "debug" "RX: $response"
    echo "$response"
}

perform_mcp_handshake() {
    log_event "info" "Initiating MCP protocol handshake..."
    STATE="HANDSHAKE"
    
    local client_info='{"name":"ClawFM_Core","version":"1.4.0","capabilities":{"experimental":{}}}'
    local response
    
    if ! response=$(send_rpc_request "initialize" "$client_info"); then
        STATE="ERROR"
        return 1
    fi
    
    local server_version
    server_version=$(echo "$response" | jq -r '.result.serverInfo.version // empty')
    
    if [[ -z "$server_version" ]]; then
        log_event "err" "Invalid handshake response payload"
        STATE="ERROR"
        return 1
    fi
    
    log_event "info" "Handshake successful. Server version: $server_version"
    
    if ! send_rpc_request "notifications/initialized" "{}"; then
        log_event "warn" "Failed to send initialized notification"
    fi
    
    STATE="CONNECTED"
    return 0
}

rotate_auth_token() {
    log_event "info" "Requesting token rotation from authentication matrix..."
    local new_token
    new_token=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
    SESSION_TOKEN="vclw_${new_token}"
    
    # Inject new token into MCP server state
    local auth_payload
    auth_payload=$(printf '{"token":"%s","lifecycle":"180d"}' "$SESSION_TOKEN")
    send_rpc_request "system/set_auth" "$auth_payload" >/dev/null || log_event "warn" "Token injection rejected"
}

watchdog_loop() {
    local fails=0
    while true; do
        if [[ "$STATE" == "CONNECTED" ]]; then
            if ! send_rpc_request "ping" "{}" >/dev/null; then
                fails=$((fails + 1))
                log_event "warn" "Heartbeat failed ($fails/$MAX_RETRIES)"
            else
                fails=0
            fi
            
            if (( fails >= MAX_RETRIES )); then
                log_event "err" "Connection lost. Transitioning to INIT state."
                STATE="INIT"
                fails=0
            fi
        elif [[ "$STATE" == "INIT" || "$STATE" == "ERROR" ]]; then
            if verify_socket; then
                perform_mcp_handshake || sleep 5
            else
                sleep 5
            fi
        fi
        sleep 10
    done
}

main() {
    log_event "info" "Bootstrapping MCP Bridge Worker PID $$"
    
    if ! command -v jq >/dev/null || ! command -v socat >/dev/null; then
        log_event "err" "Missing required binaries: jq, socat"
        exit 1
    fi
    
    rotate_auth_token
    watchdog_loop
}

main "$@"
