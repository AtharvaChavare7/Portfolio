(() => {
  const GREETINGS = [
    { start: 23, end: 5, message: "Night owl?" },
    { start: 5, end: 7, message: "You're up early." },
    { start: 7, end: 12, message: "Good morning" },
    { start: 12, end: 14, message: "Lunch break?" },
    { start: 14, end: 17, message: "Good afternoon" },
    { start: 17, end: 20, message: "Good evening" },
    { start: 20, end: 23, message: "Winding down?" },
  ];

  function getGreeting(date = new Date()) {
    const hour = date.getHours();

    for (const slot of GREETINGS) {
      if (slot.start <= slot.end) {
        if (hour >= slot.start && hour < slot.end) {
          return slot.message;
        }
        continue;
      }

      if (hour >= slot.start || hour < slot.end) {
        return slot.message;
      }
    }

    return "Hello";
  }

  const greetingEl = document.querySelector(".hero__greeting-time");

  if (greetingEl) {
    greetingEl.textContent = getGreeting();
  }
})();
