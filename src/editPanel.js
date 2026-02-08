import { addVisitedCountry, removeVisitedCountry, addLivedRecord, deleteLivedRecord } from "./tripService.js";
import { loadUserTripData, getCountryList } from "./dataLoader.js";
import { updateGlobeTripData, setEditMode, setOnCountryClick, flashCountry } from "./globe.js";

let currentUid = null;
let editActive = false;

function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}

export function initEditPanel(uid) {
    currentUid = uid;

    const sidebarBody = document.querySelector(".sidebar__body");
    if (!sidebarBody || document.getElementById("editSection")) {
        return;
    }

    const section = createElement("div", "edit-section");
    section.id = "editSection";

    // Edit mode toggle
    const toggleRow = createElement("div", "edit-section__toggle-row");
    const toggleLabel = createElement("span", "edit-section__toggle-label", "Edit mode");
    const toggleBtn = createElement("button", "edit-section__toggle-btn", "Off");
    toggleBtn.type = "button";
    toggleBtn.addEventListener("click", () => {
        editActive = !editActive;
        toggleBtn.textContent = editActive ? "On" : "Off";
        toggleBtn.classList.toggle("edit-section__toggle-btn--active", editActive);
        setEditMode(editActive);
        livedForm.style.display = editActive ? "flex" : "none";
    });
    toggleRow.appendChild(toggleLabel);
    toggleRow.appendChild(toggleBtn);
    section.appendChild(toggleRow);

    // Lived entry form
    const livedForm = createElement("div", "edit-section__lived-form");
    livedForm.style.display = "none";

    const formTitle = createElement("span", "edit-section__form-title", "Add place lived");

    const countryInput = createElement("input", "edit-section__input");
    countryInput.type = "text";
    countryInput.placeholder = "Country name";
    countryInput.setAttribute("list", "countryDatalist");
    countryInput.setAttribute("autocomplete", "off");

    const datalist = document.createElement("datalist");
    datalist.id = "countryDatalist";
    getCountryList().forEach(({ name }) => {
        const opt = document.createElement("option");
        opt.value = name;
        datalist.appendChild(opt);
    });


    const citiesInput = createElement("input", "edit-section__input");
    citiesInput.type = "text";
    citiesInput.placeholder = "Cities (comma-separated)";

    const descInput = createElement("input", "edit-section__input");
    descInput.type = "text";
    descInput.placeholder = "Description (e.g. Work)";

    const periodInput = createElement("input", "edit-section__input");
    periodInput.type = "text";
    periodInput.placeholder = "Period (e.g. Jan 2022 → Dec 2023)";

    const addBtn = createElement("button", "edit-section__add-btn", "Add lived record");
    addBtn.type = "button";
    const formError = createElement("p", "edit-section__error");

    addBtn.addEventListener("click", async () => {
        formError.textContent = "";
        const country = countryInput.value.trim();
        if (!currentUid || !country) {
            formError.textContent = "Select a country";
            return;
        }
        const match = getCountryList().find(c => c.name.toLowerCase() === country.toLowerCase());
        if (!match) {
            formError.textContent = "Country not found — pick from the list";
            return;
        }
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";
        try {
            await addLivedRecord(currentUid, {
                countryCode: match.code,
                country: match.name,
                cities: citiesInput.value.split(",").map(c => c.trim()).filter(Boolean),
                description: descInput.value.trim(),
                period: periodInput.value.trim()
            });
            countryInput.value = "";
            citiesInput.value = "";
            descInput.value = "";
            periodInput.value = "";
            await refreshTripData();
        } catch (err) {
            console.error("Failed to add lived record", err);
        }
        addBtn.disabled = false;
        addBtn.textContent = "Add lived record";
    });

    livedForm.appendChild(formTitle);
    livedForm.appendChild(countryInput);
    livedForm.appendChild(datalist);
    livedForm.appendChild(citiesInput);
    livedForm.appendChild(descInput);
    livedForm.appendChild(periodInput);
    livedForm.appendChild(formError);
    livedForm.appendChild(addBtn);
    section.appendChild(livedForm);

    sidebarBody.appendChild(section);

    // Set up country click handler for toggling visited
    setOnCountryClick(async (datum) => {
        if (!currentUid || !datum.normalizedId) return;
        const isCurrentlyVisited = d3.select("#mapViz").select("svg")
            .node().__globeState.visitedSet.has(datum.normalizedId);

        try {
            if (isCurrentlyVisited) {
                await removeVisitedCountry(currentUid, datum.normalizedId);
                flashCountry(datum.normalizedId, "#ff6b6b");
            } else {
                await addVisitedCountry(currentUid, datum.normalizedId);
                flashCountry(datum.normalizedId, "#4ade80");
            }
            await refreshTripData();
        } catch (err) {
            console.error("Failed to toggle visited", err);
        }
    });
}

export function removeEditPanel() {
    currentUid = null;
    editActive = false;
    setEditMode(false);
    setOnCountryClick(null);
    const section = document.getElementById("editSection");
    if (section) {
        section.remove();
    }
}

async function refreshTripData() {
    if (!currentUid) return;
    try {
        const tripData = await loadUserTripData(currentUid);
        updateGlobeTripData(tripData);
    } catch (err) {
        console.error("Failed to refresh trip data", err);
    }
}
