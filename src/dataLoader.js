import { loadVisitedCountries, loadLivedRecords } from "./tripService.js";

let _countryList = []; // { name, code } pairs populated by loadStaticData

export function getCountryList() {
    return _countryList;
}

// Load static data that doesn't change per user (world geometry, names, facts)
export function loadStaticData() {
    return new Promise((resolve, reject) => {
        d3.json("world.json", function(worldError, world) {
            if (worldError || !world) {
                reject(worldError || new Error("Unable to load world.json"));
                return;
            }

            d3.tsv("country-names.tsv", function(namesError, names) {
                if (namesError || !names) {
                    reject(namesError || new Error("Unable to load country-names.tsv"));
                    return;
                }

                const nameById = buildNameMap(names);
                _countryList = buildCountryList(names);

                d3.json("country-facts.json", function(factsError, facts) {
                    if (factsError) {
                        reject(factsError);
                        return;
                    }

                    const normalizedFacts = normalizeFacts(facts || {});

                    resolve({
                        world,
                        nameById,
                        facts: normalizedFacts
                    });
                });
            });
        });
    });
}

// Load user trip data from Firestore
export async function loadUserTripData(uid) {
    const visitedSet = await loadVisitedCountries(uid);
    const livedRecords = await loadLivedRecords(uid);
    const livedIndex = buildLivedIndex({ records: livedRecords });
    return { visitedSet, livedIndex };
}

export function emptyTripData() {
    return {
        visitedSet: d3.set(),
        livedIndex: { set: d3.set(), detail: {} }
    };
}

export function buildCountryList(records) {
    const seen = new Set();
    const list = [];
    records.forEach(record => {
        const name = (record.name || "").trim();
        const code = normalizeId(record.iso_n3);
        if (name && code && !seen.has(name)) {
            seen.add(name);
            list.push({ name, code });
        }
    });
    list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
}

export function buildNameMap(records) {
    const map = {};
    records.forEach(record => {
        const name = record.name;
        [
            record.iso_n3,
            record.iso_a3,
            record.adm0_a3,
            record.sov_a3
        ].forEach(code => {
            const normalized = normalizeId(code);
            if (normalized) {
                map[normalized] = name;
            }
        });
    });
    return map;
}

export function normalizeFacts(rawFacts) {
    const normalized = {};
    if (!rawFacts) {
        return normalized;
    }
    Object.keys(rawFacts).forEach(key => {
        const normalizedKey = normalizeId(key);
        if (normalizedKey) {
            normalized[normalizedKey] = rawFacts[key];
        }
    });
    return normalized;
}

export function buildVisitedSet(rawVisited) {
    const set = d3.set();
    if (!rawVisited || !rawVisited.visited) {
        return set;
    }

    rawVisited.visited.forEach(code => {
        const normalized = normalizeId(code);
        if (normalized) {
            set.add(normalized);
        }
    });
    return set;
}

export function buildLivedIndex(rawLived) {
    const livedSet = d3.set();
    const livedDetails = {};

    if (!rawLived || !rawLived.records) {
        return { set: livedSet, detail: livedDetails };
    }

    rawLived.records.forEach(entry => {
        if (!entry) {
            return;
        }

        const normalized = normalizeId(entry.countryCode || entry.country);
        if (!normalized) {
            return;
        }

        livedSet.add(normalized);

        if (!livedDetails[normalized]) {
            livedDetails[normalized] = [];
        }

        const cities = normalizeCities(entry.cities);
        const periodText = (entry.period || entry.yearRange || "").trim();
        const timelineData = computeTimeline(periodText);

        livedDetails[normalized].push({
            description: (entry.description || "").trim(),
            timeline: timelineData.timeline,
            primaryCity: cities.length ? cities[0] : "",
            cities,
            country: (entry.country || "").trim(),
            durationDays: timelineData.durationDays
        });
    });

    return { set: livedSet, detail: livedDetails };
}

function normalizeCities(value) {
    if (!value) {
        return [];
    }
    if (Array.isArray(value)) {
        return value.map(city => (city || "").toString().trim()).filter(Boolean);
    }
    return value.split(",").map(city => city.trim()).filter(Boolean);
}

function computeTimeline(periodText) {
    const result = { timeline: "", durationDays: 0 };
    if (!periodText) {
        return result;
    }

    const arrowParts = periodText.split("→");
    const dashParts = periodText.split("-");

    let startDate = null;
    let endDate = null;

    if (arrowParts.length === 2) {
        startDate = parseDateFromString(arrowParts[0]);
        endDate = parseDateFromString(arrowParts[1]);
    } else if (dashParts.length === 2) {
        startDate = parseDateFromString(dashParts[0]);
        endDate = parseDateFromString(dashParts[1]);
    }

    if (startDate && endDate) {
        const duration = calculateDuration(startDate, endDate);
        result.timeline = duration.timeline;
        result.durationDays = duration.durationDays;
        return result;
    }

    result.timeline = periodText;
    return result;
}

function calculateDuration(startDate, endDate) {
    if (!startDate || !endDate) {
        return { timeline: "", durationDays: 0 };
    }

    if (endDate < startDate) {
        const temp = endDate;
        endDate = startDate;
        startDate = temp;
    }

    const totalDays = Math.max(0, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
    const timeline = formatDuration(totalDays, startDate, endDate);

    return { timeline, durationDays: totalDays };
}

function formatDuration(totalDays, startDate, endDate) {
    const weeksTotal = Math.floor(totalDays / 7);
    const years = Math.floor(weeksTotal / 52);
    const weeks = weeksTotal - years * 52;

    const parts = [];
    if (years > 0) {
        parts.push(`${years} year${years === 1 ? "" : "s"}`);
    }
    if (weeks > 0) {
        parts.push(`${weeks} week${weeks === 1 ? "" : "s"}`);
    }
    if (!parts.length) {
        return formatYearRange(startDate, endDate);
    }
    return `${formatYearRange(startDate, endDate)} (${parts.join(", ")})`;
}

function formatYearRange(startDate, endDate) {
    const startYear = startDate.getFullYear();
    const endYear = endDate.getFullYear();
    return startYear === endYear ? `${startYear}` : `${startYear} → ${endYear}`;
}

function parseDateFromString(value) {
    if (!value) {
        return null;
    }
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (!trimmed) {
        return null;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeId(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const str = `${value}`.trim();
    if (!str) {
        return null;
    }
    if (/^\d+$/.test(str)) {
        return (`000${str}`).slice(-3);
    }
    return str.toUpperCase();
}
