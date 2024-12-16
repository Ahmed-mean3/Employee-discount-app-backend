const crypto = require("crypto");

const algorithm = "aes-256-ctr"; // Encryption algorithm
const secretKey = process.env.SECRET_KEY; // Store securely in env variables

const Hash = {
  encrypt: (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      algorithm,
      Buffer.from(secretKey, "hex"),
      iv
    );
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return JSON.stringify({
      iv: iv.toString("hex"),
      content: encrypted.toString("hex"),
    });
  },
  decrypt: (hash) => {
    if (!hash || typeof hash !== "string") {
      throw new Error("Invalid hash to decrypt");
    }
    let parsedHash;
    try {
      parsedHash = JSON.parse(hash);
    } catch {
      throw new Error("Invalid JSON format for hash");
    }

    const decipher = crypto.createDecipheriv(
      algorithm,
      Buffer.from(secretKey, "hex"),
      Buffer.from(parsedHash.iv, "hex")
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(parsedHash.content, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString();
  },
};

module.exports = Hash;
