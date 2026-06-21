(() => {
  const message = document.querySelector("#message");
  const status = document.querySelector("#status");
  const config = window.APP_CONFIG;

  const client = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);

  function render(state) {
    if (!state || !state.active) {
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
  }

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
