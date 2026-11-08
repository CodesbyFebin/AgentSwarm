use serde_json::{json, Value};
use crate::canonical::{canonical_hash, canonical_stringify};
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct Manifest { pub agent_did: String, pub name: String, pub capabilities: Vec<String>, pub max_concurrent: u32, pub version: String, pub hash: String }
pub fn create_manifest(agent_did: &str, name: &str, capabilities: Vec<String>, max_concurrent: u32) -> Manifest {
    let v = json!({"agentDid": agent_did, "name": name, "capabilities": capabilities, "maxConcurrent": max_concurrent, "version": "agentswarm-manifest/0.1"});
    Manifest { agent_did: agent_did.to_string(), name: name.to_string(), capabilities, max_concurrent, version: "agentswarm-manifest/0.1".to_string(), hash: canonical_hash(&v) }
}
pub fn verify_manifest(m: &Manifest) -> Result<(), String> {
    let v = json!({"agentDid": m.agent_did, "name": m.name, "capabilities": m.capabilities, "maxConcurrent": m.max_concurrent, "version": m.version});
    if canonical_hash(&v) != m.hash { return Err("MANIFEST_HASH_MISMATCH".into()); }
    if m.max_concurrent == 0 { return Err("MANIFEST_MAX_CONCURRENT_ZERO".into()); }
    if m.capabilities.is_empty() { return Err("MANIFEST_NO_CAPABILITIES".into()); }
    let _ = canonical_stringify(&v);
    Ok(())
}
