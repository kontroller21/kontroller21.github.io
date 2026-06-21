(() => {
  const message = document.querySelector("#message");
  const status = document.querySelector("#status");
  const startButton = document.querySelector("#start-display");
  const config = window.APP_CONFIG;
  let speechEnabled = false;
  let activeMessage = "";
  let repeatTimer;

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

  function stopSpeech() {
    window.clearTimeout(repeatTimer);
    window.speechSynthesis.cancel();
  }

  function speakRepeatedly() {
    stopSpeech();
    if (!speechEnabled || !activeMessage) return;

    const utterance = new SpeechSynthesisUtterance(activeMessage);
    utterance.lang = "nb-NO";
    utterance.rate = 0.9;
    utterance.onend = () => {
      repeatTimer = window.setTimeout(speakRepeatedly, 500);
    };
    utterance.onerror = () => {
      repeatTimer = window.setTimeout(speakRepeatedly, 500);
    };
    window.speechSynthesis.speak(utterance);
  }

  async function enterFullscreen() {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
        startButton.hidden = true;
        return true;
      } catch (error) {
        console.warn("Fullscreen was not available.", error);
      }
    }
    return Boolean(document.fullscreenElement);
  }

  function render(state) {
    if (!state || !state.active) {
      activeMessage = "";
      stopSpeech();
      document.body.style.backgroundColor = "#f5f2ea";
      message.hidden = true;
      message.textContent = "";
      status.hidden = false;
      status.textContent = "";
      return;
    }

    document.body.style.backgroundColor = state.background_color;
    message.textContent = state.message;
    message.hidden = false;
    status.hidden = true;

    if (activeMessage !== state.message) {
      activeMessage = state.message;
      speakRepeatedly();
    }
  }

  startButton.addEventListener("click", async () => {
    speechEnabled = true;
    await enterFullscreen();
    speakRepeatedly();
  });

  document.addEventListener(
    "click",
    async () => {
      speechEnabled = true;
      await enterFullscreen();
      speakRepeatedly();
    },
    { once: true },
  );

  enterFullscreen();

  async function loadState() {
    const { data, error } = await client
      .from("display_state")
      .select("active,message,background_color")
      .eq("id", 1)
      .single();

    if (error) {
      status.hidden = false;
      status.textContent = "Kunne ikke koble til.";
      console.error(error);
      return;
    }

    render(data);
  }

  client
    .channel("display-state")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "display_state", filter: "id=eq.1" },
      ({ new: state }) => render(state),
    )
    .subscribe((subscriptionStatus) => {
      if (subscriptionStatus === "SUBSCRIBED") loadState();
    });

  loadState();
  window.setInterval(loadState, 15000);
})();
