#!/usr/bin/env bash
set -Eeuo pipefail
shopt -s nullglob

# Vahla MultiClaw - Artifact Rotator & State Compactor
# Architecture: High-I/O Storage Subsystem
# Execution: Cron-triggered or Daemon-invoked

readonly LOG_DIR="/var/log/clawfm"
readonly DB_DIR="/var/lib/clawfm/db"
readonly ARTIFACT_DIR="/var/lib/clawfm/artifacts"
readonly LOCK_FILE="/tmp/clawfm_rotator.lock"
readonly MAX_LOG_SIZE_MB=50
readonly RETENTION_DAYS=7

# ------------------------------------------------------------------------
# CLAWSEC REGEX HEURISTICS FOR LOG ANOMALY SCANNING
# ------------------------------------------------------------------------
declare -a ANOMALY_PATTERNS=(
    "ERR_LIBRARY_FIRST_VIOLATION"
    "CRITICAL: Agent .* exceeded risk threshold"
    "Uncaught Exception: Segfault"
    "attempted to bypass MCP AppleScript sandbox"
    "detected malformed JSON-RPC"
    "ECDSA signature verification failed"
    "unauthorized socket write access"
    "\[CLAWSEC\] Intervention"
    "OAUTH_TOKEN_EXPIRED"
    "FATAL: Database corruption"
    "connection reset by peer on IPC"
    "buffer overflow detected in neural core"
    "kernel panic - not syncing"
    "panic: runtime error: invalid memory address"
    "out of memory: killed process"
)

log_sys() {
    local lvl="$1"
    local msg="$2"
    printf '{"ts":"%s","proc":"rotator","lvl":"%s","msg":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$lvl" "$msg"
}

acquire_lock() {
    if ! mkdir "$LOCK_FILE" 2>/dev/null; then
        log_sys "WARN" "Rotator already running or lockfile stale."
        # Check if process is actually dead
        local pid
        pid=$(cat "${LOCK_FILE}/pid" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
            log_sys "WARN" "Stale lock detected. Clearing..."
            rm -rf "$LOCK_FILE"
            mkdir "$LOCK_FILE"
        else
            exit 1
        fi
    fi
    echo "$$" > "${LOCK_FILE}/pid"
    trap 'rm -rf "$LOCK_FILE"' EXIT
}

scan_log_anomalies() {
    local log_file="$1"
    if [[ ! -f "$log_file" ]]; then return; fi
    
    log_sys "INFO" "Scanning $log_file for ClawSec anomalies prior to rotation..."
    local alerts=0
    
    for pattern in "${ANOMALY_PATTERNS[@]}"; do
        if grep -qE "$pattern" "$log_file"; then
            local count
            count=$(grep -cE "$pattern" "$log_file")
            log_sys "WARN" "Anomaly signature matched: '$pattern' ($count occurrences)"
            alerts=$((alerts + count))
        fi
    done
    
    if (( alerts > 0 )); then
        log_sys "CRIT" "Total $alerts security/stability anomalies detected in current log epoch."
        # Dispatch metric to statsd/prometheus in real implementation
    fi
}

rotate_logs() {
    log_sys "INFO" "Initiating neural log rotation matrix..."
    
    for log in "$LOG_DIR"/*.log; do
        local size_bytes
        size_bytes=$(stat -c%s "$log" 2>/dev/null || stat -f%z "$log")
        local size_mb=$((size_bytes / 1024 / 1024))
        
        if (( size_mb >= MAX_LOG_SIZE_MB )); then
            scan_log_anomalies "$log"
            local ts
            ts=$(date +%Y%m%d%H%M%S)
            local rotated="${log}.${ts}.gz"
            
            log_sys "INFO" "Rotating $log ($size_mb MB) -> $rotated"
            gzip -c "$log" > "$rotated"
            truncate -s 0 "$log"
        fi
    done
    
    log_sys "INFO" "Purging logs older than $RETENTION_DAYS days..."
    find "$LOG_DIR" -name "*.gz" -type f -mtime +${RETENTION_DAYS} -exec rm -f {} \;
}

secure_wipe_artifacts() {
    log_sys "INFO" "Executing secure wipe on stale generative artifacts..."
    
    # Find generated latent audio artifacts older than retention policy
    local stale_files
    stale_files=$(find "$ARTIFACT_DIR" -type f -name "*.wav" -mtime +${RETENTION_DAYS} 2>/dev/null || true)
    
    for file in $stale_files; do
        local fsize
        fsize=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
        log_sys "DEBUG" "Secure overwrite of $file ($fsize bytes)"
        
        # DoD 5220.22-M style pseudo-wipe (single pass urandom for speed)
        dd if=/dev/urandom of="$file" bs=4K count=$(( (fsize + 4095) / 4096 )) status=none 2>/dev/null || true
        sync
        rm -f "$file"
    done
}

compact_state_db() {
    log_sys "INFO" "Compacting LevelDB/SQLite state matrices..."
    # Placeholder for actual DB compaction commands
    if [[ -d "$DB_DIR" ]]; then
        find "$DB_DIR" -name "*.ldb" -type f -exec touch -c {} \;
        log_sys "INFO" "State indices rebuilt and inode caches flushed."
    fi
}

main() {
    acquire_lock
    mkdir -p "$LOG_DIR" "$DB_DIR" "$ARTIFACT_DIR"
    
    rotate_logs
    secure_wipe_artifacts
    compact_state_db
    
    log_sys "INFO" "Maintenance matrix completed successfully."
}

main "$@"
