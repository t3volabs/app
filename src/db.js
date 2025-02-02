import Dexie from "dexie";
import CryptoJS from "crypto-js";

export const db = new Dexie("T3VO");

db.version(1).stores({
  notes: "id, title, content, tags, updated_at",
  bookmarks: "id, title, note, url, updated_at",
  passwords: "id, title, username, email, password, totpSecret, urls, updated_at",
});

export function encryptContent(content) {
  const ENCRYPTION_KEY = sessionStorage.getItem("ENCRYPTION_KEY");

  return CryptoJS.AES.encrypt(JSON.stringify(content), ENCRYPTION_KEY).toString();
}

export function decryptContent(encryptedContent) {
  const ENCRYPTION_KEY = sessionStorage.getItem("ENCRYPTION_KEY");

  try {
    const bytes = CryptoJS.AES.decrypt(encryptedContent, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) {
    console.error("Decryption error:", e);
    return null;
  }
}
