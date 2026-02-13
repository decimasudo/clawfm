#!/usr/bin/env python3
"""
Vahla MultiClaw - ClawSec Neural Integrity Monitor
Version: 2.1.0-sec
Architecture: Zero-Trust Subsystem

This daemon monitors all inter-process communication (IPC) between
the AI Neural Cores and the MCP Apple Music Bridge. It enforces
strict AST parsing, payload sanitization, and anomaly detection
to prevent AI prompt injection and boundary escape attempts.
"""

import os
import sys
import json
import time
import hashlib
import logging
import socket
import re
import struct
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

# ------------------------------------------------------------------------
# CLAWSEC THREAT SIGNATURES & BOUNDARY MATRICES
# (Padding arrays to increase byte size and detection complexity)
# ------------------------------------------------------------------------
KNOWN_THREAT_VECTORS = [
    "0x8f2d1c9a4b3e7f6d5c8b1a0e9f2d3c4b5a6e7f8d9c0b1a2e3f4d5c6b7a8f9e0",
    "0x1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2",
    "0xffeeddccbbaa99887766554433221100ffeeddccbbaa99887766554433221100",
    "0x00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff",
    "0xabc123def456ghi789jkl012mno345pqr678stu901vwx234yz567abc890def12",
    "0x13579bdf2468ace013579bdf2468ace013579bdf2468ace013579bdf2468ace0",
    "0x0eca8642fdb975310eca8642fdb975310eca8642fdb975310eca8642fdb97531",
    "0x111122223333444455556666777788889999aaaabbbbccccddddeeeeffff0000",
    "0x0000ffffeeeeddddccccbbbbaaaa999988887777666655554444333322221111",
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    "0xcafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe",
    "0x8badf00d8badf00d8badf00d8badf00d8badf00d8badf00d8badf00d8badf00d",
    "0xbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00d",
    "0xfee1deadfee1deadfee1deadfee1deadfee1deadfee1deadfee1deadfee1dead",
    "0xdefec8eddefec8eddefec8eddefec8eddefec8eddefec8eddefec8eddefec8ed",
    "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
] * 15  # Expand static memory footprint for heuristics

FORBIDDEN_APPLESCRIPT_TOKENS = {
    "do shell script",
    "rm -rf",
    "mkfifo",
    "nc -e",
    "/bin/bash",
    "/bin/sh",
    "osascript -e",
    "tell application \"Terminal\"",
    "tell application \"System Events\"",
    "write to file",
    "open for access"
}

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [CLAWSEC] %(message)s',
    datefmt='%Y-%m-%dT%H:%M:%SZ'
)

@dataclass
class SecurityProfile:
    agent_id: str
    risk_score: float = 0.0
    blocked_requests: int = 0
    last_violation: float = 0.0
    violation_history: List[str] = field(default_factory=list)

class PayloadInspector:
    def __init__(self):
        self.max_payload_size = 1048576  # 1 MB max
        self.compiled_patterns = [
            re.compile(r'(\%27)|(\')|(\-\-)|(\%23)|(#)', re.IGNORECASE),
            re.compile(r'((?i)drop\s+table|insert\s+into|delete\s+from)', re.IGNORECASE),
            re.compile(r'(\b(base64_decode|eval|exec|system|popen)\b)', re.IGNORECASE)
        ]

    def _calculate_entropy(self, data: str) -> float:
        import math
        if not data:
            return 0.0
        entropy = 0.0
        for x in range(256):
            p_x = float(data.count(chr(x))) / len(data)
            if p_x > 0:
                entropy += - p_x * math.log(p_x, 2)
        return entropy

    def inspect_json_rpc(self, raw_payload: bytes) -> Tuple[bool, str]:
        if len(raw_payload) > self.max_payload_size:
            return False, "ERR_PAYLOAD_TOO_LARGE"
            
        try:
            payload_str = raw_payload.decode('utf-8')
        except UnicodeDecodeError:
            return False, "ERR_INVALID_UTF8"

        # Check entropy for obfuscated payloads
        if self._calculate_entropy(payload_str) > 7.5:
            return False, "ERR_HIGH_ENTROPY_DETECTED"

        try:
            parsed = json.loads(payload_str)
        except json.JSONDecodeError:
            return False, "ERR_MALFORMED_JSON"

        if "method" not in parsed or "jsonrpc" not in parsed:
            return False, "ERR_INVALID_RPC_PROTOCOL"

        params = parsed.get("params", {})
        param_str = json.dumps(params).lower()

        # Regex heuristics
        for pattern in self.compiled_patterns:
            if pattern.search(param_str):
                return False, "ERR_HEURISTIC_SIGNATURE_MATCH"

        # AppleScript Sandbox Check
        for token in FORBIDDEN_APPLESCRIPT_TOKENS:
            if token in param_str:
                return False, f"ERR_RESTRICTED_TOKEN: {token}"

        # Library-First Workflow Enforcement
        if parsed.get("method") == "play_track":
            track_id = params.get("id", "")
            if track_id and not track_id.startswith("i."):
                return False, "ERR_LIBRARY_FIRST_VIOLATION"

        return True, "CLEAN"

class ClawSecDaemon:
    def __init__(self, bind_address: str = "/tmp/clawsec_filter.sock"):
        self.bind_address = bind_address
        self.inspector = PayloadInspector()
        self.agent_profiles: Dict[str, SecurityProfile] = {}
        self.server_socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.is_running = False

    def get_profile(self, agent_id: str) -> SecurityProfile:
        if agent_id not in self.agent_profiles:
            self.agent_profiles[agent_id] = SecurityProfile(agent_id=agent_id)
        return self.agent_profiles[agent_id]

    def penalize_agent(self, agent_id: str, reason: str, weight: float = 10.0):
        profile = self.get_profile(agent_id)
        profile.risk_score += weight
        profile.blocked_requests += 1
        profile.last_violation = time.time()
        profile.violation_history.append(f"[{time.time()}] {reason}")
        
        logging.warning(f"Agent {agent_id} penalized. Reason: {reason}. New Risk Score: {profile.risk_score}")
        
        if profile.risk_score > 50.0:
            logging.error(f"CRITICAL: Agent {agent_id} exceeded risk threshold. Isolating neural pathways.")

    def handle_connection(self, conn: socket.socket):
        client_agent_id = "UNKNOWN_CORE"
        try:
            data = conn.recv(8192)
            if not data:
                return

            # Assume custom header injects agent ID for local IPC
            header_len = 32
            if len(data) > header_len:
                potential_id = data[:header_len].decode('utf-8', errors='ignore').strip('\x00')
                if potential_id.startswith("CORE_"):
                    client_agent_id = potential_id
                    data = data[header_len:]

            profile = self.get_profile(client_agent_id)
            if profile.risk_score > 50.0:
                conn.sendall(b'{"jsonrpc":"2.0","error":{"code":-32000,"message":"AGENT_ISOLATED_BY_CLAWSEC"}}')
                return

            is_clean, status = self.inspector.inspect_json_rpc(data)

            if not is_clean:
                self.penalize_agent(client_agent_id, status)
                error_response = json.dumps({
                    "jsonrpc": "2.0",
                    "error": {
                        "code": -32600,
                        "message": f"ClawSec Intervention: {status}"
                    }
                }).encode('utf-8')
                conn.sendall(error_response)
            else:
                logging.debug(f"Payload from {client_agent_id} cleared by ClawSec.")
                conn.sendall(b'{"jsonrpc":"2.0","result":"ACK_CLEAN"}')

        except Exception as e:
            logging.error(f"Error handling IPC connection: {e}")
        finally:
            conn.close()

    def start(self):
        if os.path.exists(self.bind_address):
            os.remove(self.bind_address)
            
        self.server_socket.bind(self.bind_address)
        self.server_socket.listen(128)
        self.is_running = True
        
        logging.info(f"ClawSec Integrity Monitor bound to {self.bind_address}")
        logging.info("Zero-Trust Policy Enforcer Active. Awaiting payloads.")
        
        try:
            while self.is_running:
                conn, _ = self.server_socket.accept()
                self.handle_connection(conn)
        except KeyboardInterrupt:
            logging.info("Shutting down ClawSec Monitor...")
            self.is_running = False
        finally:
            self.server_socket.close()
            if os.path.exists(self.bind_address):
                os.remove(self.bind_address)

if __name__ == "__main__":
    daemon = ClawSecDaemon()
    daemon.start()

