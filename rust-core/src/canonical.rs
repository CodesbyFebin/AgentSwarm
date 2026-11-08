use serde_json::Value;
use sha2::{Digest, Sha256};
pub fn sha256_hex(b: &[u8]) -> String { hex::encode(Sha256::digest(b)) }
pub fn canonical_stringify(v: &Value) -> String { serde_json::to_string(v).unwrap() }
pub fn canonical_hash(v: &Value) -> String { sha256_hex(canonical_stringify(v).as_bytes()) }
