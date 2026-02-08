#!/usr/bin/env node

// One-time migration: reads visited.json + lived.json and writes to Firestore
// under the specified user's account.
//
// Usage:
//   node scripts/migrate-data.js <firebase-uid>
//
// Requires: npm install firebase-admin

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const uid = process.argv[2];
if (!uid) {
    console.error("Usage: node scripts/migrate-data.js <firebase-uid>");
    process.exit(1);
}

// Uses Application Default Credentials (run: gcloud auth application-default login)
// or set GOOGLE_APPLICATION_CREDENTIALS to a service account key file
admin.initializeApp({ projectId: "trip-globe-viz" });
const db = admin.firestore();

function normalizeCode(value) {
    if (!value) return "";
    const str = `${value}`.trim();
    if (/^\d+$/.test(str)) {
        return (`000${str}`).slice(-3);
    }
    return str.toUpperCase();
}

async function migrateVisited() {
    const filePath = path.join(__dirname, "..", "visited.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const codes = raw.visited || [];

    console.log(`Migrating ${codes.length} visited countries...`);

    const batch = db.batch();
    codes.forEach(code => {
        const normalized = normalizeCode(code);
        const ref = db.collection("users").doc(uid)
            .collection("visited").doc(normalized);
        batch.set(ref, {
            code: normalized,
            addedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    console.log(`  Done: ${codes.length} visited countries written.`);
}

async function migrateLived() {
    const filePath = path.join(__dirname, "..", "lived.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const records = raw.records || [];

    console.log(`Migrating ${records.length} lived records...`);

    const batch = db.batch();
    records.forEach(record => {
        const ref = db.collection("users").doc(uid)
            .collection("lived").doc();
        batch.set(ref, {
            countryCode: normalizeCode(record.countryCode || ""),
            country: record.country || "",
            cities: record.cities || [],
            description: record.description || "",
            period: record.period || "",
            addedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    console.log(`  Done: ${records.length} lived records written.`);
}

async function main() {
    console.log(`Migrating data for user: ${uid}`);
    await migrateVisited();
    await migrateLived();
    console.log("Migration complete!");
}

main().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
