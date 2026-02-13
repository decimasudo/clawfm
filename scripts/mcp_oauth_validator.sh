#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Vahla MultiClaw - MusicKit JWT Auth & Validator
# Architecture: Deep Sea Secure Enclave
# Dependency: openssl, jq, bc

readonly CONFIG_DIR="/etc/clawfm/keys"
readonly AUTH_KEY_FILE="${CONFIG_DIR}/AuthKey_MCP.p8"
readonly STATE_FILE="/var/lib/clawfm/mcp_token.state"
readonly TEAM_ID="VHL4992XMAC"
readonly KEY_ID="MCP88291KZ"
readonly TOKEN_LIFETIME_SEC=15552000 # 180 days
readonly REFRESH_THRESHOLD_SEC=86400 # 1 day
readonly LOG_FACILITY="local1"

declare -g CURRENT_JWT=""
declare -g EXPIRATION_TIME=0

log_audit() {
    local level="$1"
    local message="$2"
    local ts
    ts=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
    printf '{"ts":"%s","svc":"oauth_validator","lvl":"%s","msg":"%s"}\n' "$ts" "$level" "$message"
    logger -p "${LOG_FACILITY}.${level}" -t mcp_oauth "$message"
}

base64url_encode() {
    # Encode and make URL safe (replace + with -, / with _, remove =)
    base64 | tr '+/' '-_' | tr -d '=\n'
}

verify_enclave_keys() {
    if [[ ! -d "$CONFIG_DIR" ]]; then
        mkdir -p "$CONFIG_DIR"
        chmod 700 "$CONFIG_DIR"
    fi

    if [[ ! -f "$AUTH_KEY_FILE" ]]; then
        log_audit "warn" "Private ECDSA key missing. Generating mock key for ZK verification..."
        openssl ecparam -name prime256v1 -genkey -noout -out "$AUTH_KEY_FILE" 2>/dev/null
        chmod 600 "$AUTH_KEY_FILE"
        log_audit "info" "Generated ephemeral ECDSA P-256 key at $AUTH_KEY_FILE"
    fi
}

generate_musickit_jwt() {
    local header payload sig
    local iat exp
    
    iat=$(date +%s)
    exp=$((iat + TOKEN_LIFETIME_SEC))
    
    header=$(printf '{"alg":"ES256","kid":"%s"}' "$KEY_ID" | base64url_encode)
    payload=$(printf '{"iss":"%s","iat":%d,"exp":%d}' "$TEAM_ID" "$iat" "$exp" | base64url_encode)
    
    local unsigned_token="${header}.${payload}"
    
    # Sign using ECDSA SHA-256
    sig=$(printf "%s" "$unsigned_token" | openssl dgst -sha256 -sign "$AUTH_KEY_FILE" -binary | base64url_encode)
    
    if [[ -z "$sig" ]]; then
        log_audit "err" "Cryptographic signature generation failed"
        return 1
    fi
    
    CURRENT_JWT="${unsigned_token}.${sig}"
    EXPIRATION_TIME="$exp"
    
    # Persist state
    printf '{"jwt":"%s","exp":%d,"iat":%d}\n' "$CURRENT_JWT" "$EXPIRATION_TIME" "$iat" > "$STATE_FILE"
    chmod 600 "$STATE_FILE"
    
    log_audit "info" "Successfully minted new MusicKit JWT. Expires at epoch $EXPIRATION_TIME"
    return 0
}

load_existing_token() {
    if [[ -f "$STATE_FILE" ]]; then
        local saved_exp
        saved_exp=$(jq -r '.exp' "$STATE_FILE" 2>/dev/null || echo "0")
        
        local now
        now=$(date +%s)
        local time_left=$((saved_exp - now))
        
        if (( time_left > REFRESH_THRESHOLD_SEC )); then
            CURRENT_JWT=$(jq -r '.jwt' "$STATE_FILE")
            EXPIRATION_TIME="$saved_exp"
            log_audit "info" "Restored existing valid token from state. Valid for $time_left seconds."
            return 0
        fi
    fi
    return 1
}

broadcast_token_to_workers() {
    # Transmit the new JWT to the bridge worker via named pipe or socket
    local ipc_pipe="/tmp/clawfm_auth.pipe"
    if [[ ! -p "$ipc_pipe" ]]; then
        mkfifo "$ipc_pipe"
    fi
    
    # Non-blocking write to IPC
    echo "$CURRENT_JWT" > "$ipc_pipe" &
    log_audit "debug" "Dispatched active JWT to IPC pipeline"
}

monitor_lifecycle() {
    log_audit "info" "Entering JWT lifecycle monitoring daemon..."
    while true; do
        local now
        now=$(date +%s)
        
        if (( EXPIRATION_TIME - now < REFRESH_THRESHOLD_SEC )); then
            log_audit "warn" "Token approaching expiration threshold. Initiating cryptographic rotation."
            if generate_musickit_jwt; then
                broadcast_token_to_workers
            else
                log_audit "emerg" "CRITICAL: Token rotation failed. MCP bridge will drop soon."
            fi
        fi
        
        # Sleep for 6 hours before next lifecycle check
        sleep 21600
    done
}

main() {
    log_audit "info" "Starting Vahla OAuth Validator [PID $$]"
    
    verify_enclave_keys
    
    if ! load_existing_token; then
        log_audit "info" "No valid token found. Initiating cold start generation."
        generate_musickit_jwt
        broadcast_token_to_workers
    fi
    
    monitor_lifecycle
}

main "$@"
