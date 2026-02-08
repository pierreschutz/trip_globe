import { getDb } from "./firebase.js";

export async function loadVisitedCountries(uid) {
    const db = getDb();
    const snapshot = await db.collection("users").doc(uid)
        .collection("visited").get();
    const set = d3.set();
    snapshot.forEach(doc => {
        const code = doc.data().code;
        if (code) {
            set.add(normalizeCode(code));
        }
    });
    return set;
}

export async function loadLivedRecords(uid) {
    const db = getDb();
    const snapshot = await db.collection("users").doc(uid)
        .collection("lived").orderBy("addedAt", "desc").get();
    const records = [];
    snapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
    });
    return records;
}

export async function addVisitedCountry(uid, code) {
    const db = getDb();
    const normalized = normalizeCode(code);
    await db.collection("users").doc(uid)
        .collection("visited").doc(normalized)
        .set({
            code: normalized,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
}

export async function removeVisitedCountry(uid, code) {
    const db = getDb();
    const normalized = normalizeCode(code);
    await db.collection("users").doc(uid)
        .collection("visited").doc(normalized)
        .delete();
}

export async function addLivedRecord(uid, record) {
    const db = getDb();
    const data = {
        countryCode: record.countryCode || "",
        country: record.country || "",
        cities: record.cities || [],
        description: record.description || "",
        period: record.period || "",
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await db.collection("users").doc(uid)
        .collection("lived").add(data);
    return { id: ref.id, ...data };
}

export async function updateLivedRecord(uid, docId, record) {
    const db = getDb();
    await db.collection("users").doc(uid)
        .collection("lived").doc(docId)
        .update({
            countryCode: record.countryCode || "",
            country: record.country || "",
            cities: record.cities || [],
            description: record.description || "",
            period: record.period || ""
        });
}

export async function deleteLivedRecord(uid, docId) {
    const db = getDb();
    await db.collection("users").doc(uid)
        .collection("lived").doc(docId)
        .delete();
}

function normalizeCode(value) {
    if (!value) return "";
    const str = `${value}`.trim();
    if (/^\d+$/.test(str)) {
        return (`000${str}`).slice(-3);
    }
    return str.toUpperCase();
}
