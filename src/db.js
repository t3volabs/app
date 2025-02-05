import Dexie from "dexie";
import CryptoJS from "crypto-js";
import { sha256 } from "js-sha256";

const ENCRYPTION_KEY = sessionStorage.getItem("ENCRYPTION_KEY");

if (!ENCRYPTION_KEY) {
  console.error("Encryption key is missing. Ensure it is set in sessionStorage.");
}

const hashedKey = ENCRYPTION_KEY ? sha256(ENCRYPTION_KEY) : null;
export const dbname = `T3VO-${hashedKey}`;

export const db = new Dexie(dbname);

db.version(1).stores({
  notes: "id, title, content, tags, updated_at",
  bookmarks: "id, title, note, url, updated_at",
  passwords: "id, title, username, email, password, totpSecret, urls, updated_at",
});

export function encryptContent(content) {
  return CryptoJS.AES.encrypt(JSON.stringify(content), ENCRYPTION_KEY).toString();
}

export function decryptContent(encryptedContent) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedData) {
      throw new Error("Failed to decrypt content.");
    }

    return JSON.parse(decryptedData);
  } catch (e) {
    console.error("Decryption error:", e.message);
    return null;
  }
}
