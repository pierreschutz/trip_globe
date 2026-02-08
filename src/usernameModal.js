import { validateUsername, isUsernameTaken, createUserProfile } from "./userService.js";
import { signOut } from "./auth.js";

function createElement(tag, className, textContent) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (textContent) el.textContent = textContent;
    return el;
}

function buildModal() {
    const modal = createElement("div", "username-modal");

    const title = createElement("h2", "username-modal__title", "Welcome to Trip Globe!");
    const subtitle = createElement("p", "username-modal__subtitle", "Pick a username for your public map URL");

    const inputGroup = createElement("div", "username-modal__input-group");
    const prefix = createElement("span", "username-modal__prefix", "globe.pierreschutz.com/");
    const input = createElement("input", "username-modal__input");
    input.type = "text";
    input.id = "usernameInput";
    input.placeholder = "your-username";
    input.maxLength = 30;
    input.autocomplete = "off";
    inputGroup.appendChild(prefix);
    inputGroup.appendChild(input);

    const error = createElement("p", "username-modal__error");
    error.id = "usernameError";

    const submit = createElement("button", "username-modal__submit", "Claim username");
    submit.id = "usernameSubmit";
    submit.disabled = true;

    modal.appendChild(title);
    modal.appendChild(subtitle);
    modal.appendChild(inputGroup);
    modal.appendChild(error);
    modal.appendChild(submit);

    return { modal, input, error, submit };
}

export function showUsernameModal(user, onComplete) {
    const overlay = createElement("div", "username-modal-overlay");
    const { modal, input, error, submit } = buildModal();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    let debounceTimer = null;

    input.addEventListener("input", () => {
        const value = input.value.toLowerCase().trim();
        input.value = value;

        clearTimeout(debounceTimer);
        error.textContent = "";
        submit.disabled = true;

        const validationError = validateUsername(value);
        if (validationError) {
            error.textContent = validationError;
            return;
        }

        debounceTimer = setTimeout(async () => {
            const taken = await isUsernameTaken(value);
            if (taken) {
                error.textContent = "Username is already taken";
            } else {
                error.textContent = "";
                submit.disabled = false;
            }
        }, 400);
    });

    submit.addEventListener("click", async () => {
        const username = input.value.toLowerCase().trim();
        submit.disabled = true;
        submit.textContent = "Creating...";

        try {
            const profile = await createUserProfile(user, username);
            overlay.remove();
            onComplete(profile);
        } catch (err) {
            console.error("Failed to create profile", err);
            error.textContent = "Something went wrong. Please try again.";
            submit.disabled = false;
            submit.textContent = "Claim username";
        }
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !submit.disabled) {
            submit.click();
        }
    });

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            overlay.remove();
            signOut().catch(err => console.error("Sign-out after dismiss failed", err));
        }
    });

    input.focus();
}
