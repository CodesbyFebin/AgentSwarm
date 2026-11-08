use ed25519_dalek::{SigningKey, VerifyingKey, Signature, Signer, Verifier};
use rand::rngs::OsRng;
#[derive(Clone)]
pub struct Agent { pub did: String, pub signing_key: SigningKey, pub verifying_key: VerifyingKey, pub name: String, pub capabilities: Vec<String> }
impl Agent {
    pub fn new(name: &str, capabilities: Vec<String>) -> Self {
        let sk = SigningKey::generate(&mut OsRng);
        let vk = sk.verifying_key();
        let did = format!("did:key:z{}", hex::encode(vk.to_bytes()));
        Self { did, signing_key: sk, verifying_key: vk, name: name.to_string(), capabilities }
    }
    pub fn sign(&self, msg: &[u8]) -> String { hex::encode(self.signing_key.sign(msg).to_bytes()) }
    pub fn verify(&self, msg: &[u8], sig_hex: &str) -> bool {
        let bytes = match hex::decode(sig_hex) { Ok(b)=>b, Err(_)=>return false };
        let sig = match Signature::from_slice(&bytes) { Ok(s)=>s, Err(_)=>return false };
        self.verifying_key.verify(msg, &sig).is_ok()
    }
}
