(() => {
  const PIN_LENGTH = 4;
  const config = window.APP_CONFIG;
  const lockPanel = document.querySelector("#lock-panel");
  const controlsPanel = document.querySelector("#controls-panel");
  const dots = document.querySelector("#pin-dots");
  const keypad = document.querySelector("#keypad");
  const feedback = document.querySelector("#feedback");
  const connection = document.querySelector("#connection");
  const customForm = document.querySelector("#custom-form");
  const stopButton = document.querySelector("#stop");
  let pin = "";
  let controllerToken = sessionStorage.getItem("controllerToken");

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

  function drawDots() {
    dots.replaceChildren();
    for (let index = 0; index < PIN_LENGTH; index += 1) {
      const dot = document.createElement("span");
      dot.className = `pin-dot${index < pin.length ? " filled" : ""}`;
      dots.append(dot);
    }
    dots.setAttribute("aria-label", `${pin.length} av ${PIN_LENGTH} sifre skrevet`);
  }

  function showControls() {
    lockPanel.hidden = true;
    controlsPanel.hidden = false;
    connection.textContent = "Kontrolleren er klar.";
  }

  function showLock(message = "") {
    controllerToken = null;
    sessionStorage.removeItem("controllerToken");
    controlsPanel.hidden = true;
    lockPanel.hidden = false;
    feedback.textContent = message;
    pin = "";
    drawDots();
  }

  async function unlock() {
    if (pin.length !== PIN_LENGTH) {
      feedback.textContent = `Koden må ha ${PIN_LENGTH} sifre.`;
      return;
    }

    feedback.textContent = "Sjekker …";
    const { data, error } = await client.rpc("unlock_controller", { entered_pin: pin });
    pin = "";
    drawDots();

    if (error || !data) {
      feedback.textContent = "Feil kode. Prøv igjen.";
      return;
    }

    controllerToken = data;
    sessionStorage.setItem("controllerToken", data);
    showControls();
  }

  async function setDisplay(active, message = "", color = "#f5f2ea") {
    connection.textContent = "Sender …";
    const { data, error } = await client.rpc("set_display", {
      session_token: controllerToken,
      new_active: active,
      new_message: message,
      new_background_color: color,
    });

    if (error || !data) {
      showLock("Økten er utløpt. Tast koden igjen.");
      return;
    }

    connection.textContent = active ? "Meldingen vises nå." : "Visningen er stoppet.";
  }

  drawDots();
  if (controllerToken) showControls();

  keypad.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    if (button.dataset.digit && pin.length < PIN_LENGTH) {
      pin += button.dataset.digit;
      feedback.textContent = "";
      drawDots();
      if (pin.length === PIN_LENGTH) unlock();
      return;
    }

    if (button.dataset.action === "clear") {
      pin = "";
      feedback.textContent = "";
      drawDots();
    } else if (button.dataset.action === "unlock") {
      unlock();
    }
  });

  controlsPanel.addEventListener("click", (event) => {
    const preset = event.target.closest("[data-preset]")?.dataset.preset;
    if (preset === "dinner") setDisplay(true, "Nå er det middag!", "#c92f3f");
    if (preset === "come-up") setDisplay(true, "Kom opp!", "#2668d8");
  });

  customForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = new FormData(customForm).get("message").trim();
    if (message) setDisplay(true, message, "#df741c");
  });

  stopButton.addEventListener("click", () => setDisplay(false));
})();
