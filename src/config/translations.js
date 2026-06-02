// Mokum Magic 8 Ball — Vertalingen
// Ondersteunde talen: nl (Nederlands), en (Engels)
// Voeg hier vertalingen toe of pas ze aan.

const translations = {
  nl: {
    welcome: "Hey! Ik ben de Mokum Magic 8 Ball 🎱 Waar kan ik je mee helpen?",
    typing: "Aan het typen...",
    placeholder: "Stel een vraag...",
    error: "Oeps, er ging iets mis. Probeer het nog eens! 🎱",
    backToTopics: "← Terug naar onderwerpen",
    backButton: "← Terug",
    askOther: "✏️ Een andere vraag stellen",
    topics: [
      { id: "pool",           emoji: "🎱", label: "Pool & Biljart" },
      { id: "darts",          emoji: "🎯", label: "Darts" },
      { id: "openingstijden", emoji: "📅", label: "Openingstijden" },
      { id: "tarieven",       emoji: "💶", label: "Tarieven" },
      { id: "toernooien",     emoji: "🏆", label: "Toernooien" },
      { id: "spelregels",     emoji: "📖", label: "Spelregels" },
      { id: "locatie",        emoji: "📍", label: "Locatie & Parkeren" },
      { id: "anders",         emoji: "❓", label: "Anders" },
    ],
    questions: {
      pool: [
        "Hoeveel tafels zijn er beschikbaar?",
        "Moet ik reserveren?",
        "Wat is het verschil tussen American en English pool?",
        "Kan ik mijn eigen keu meenemen?",
      ],
      darts: [
        "Wat kost een uur darts?",
        "Moet ik eigen pijlen meenemen?",
        "Hoeveel dartsborden zijn er?",
        "Kan ik darts combineren met pool?",
      ],
      openingstijden: [
        "Wanneer zijn jullie open?",
        "Zijn jullie ook op feestdagen open?",
        "Hoe laat is de laatste inloop?",
        "Zijn de tijden in het weekend anders?",
      ],
      tarieven: [
        "Wat kost een uur poolen?",
        "Zijn er dagprijzen of avondprijzen?",
        "Kan ik pinnen?",
        "Zijn er groepstarieven?",
      ],
      toernooien: [
        "Wanneer is het volgende toernooi?",
        "Welke toernooien zijn er aankomende week?",
        "Zijn er ook toernooien voor beginnende spelers?",
        "Wat kost deelname?",
      ],
      spelregels: [
        "Leg de regels van 8-ball uit",
        "Hoe speel je 9-ball?",
        "Hoe werkt 501 darts?",
        "Wat zijn de regels van biljart?",
      ],
      locatie: [
        "Waar is Mokum gevestigd?",
        "Hoe kom ik er met het OV?",
        "Is er parkeergelegenheid?",
        "Hoe ver is het van Amstel Station?",
      ],
    },
    hoverInfo: [
      "🕐 Openingstijden",
      "💶 Tarieven & activiteiten",
      "🏆 Toernooien & inschrijven",
      "📍 Route & parkeren",
      "🎯 Darts, biljart & shuffleboard",
      "🏢 Bedrijfsuitjes & groepen",
    ],
    hoverTitle: "IK WEET ALLES OVER:",
  },

  en: {
    welcome: "Hey! I'm the Mokum Magic 8 Ball 🎱 What can I help you with?",
    typing: "Typing...",
    placeholder: "Ask a question...",
    error: "Oops, something went wrong. Please try again! 🎱",
    backToTopics: "← Back to topics",
    backButton: "← Back",
    askOther: "✏️ Ask a different question",
    topics: [
      { id: "pool",           emoji: "🎱", label: "Pool & Billiards" },
      { id: "darts",          emoji: "🎯", label: "Darts" },
      { id: "openingstijden", emoji: "📅", label: "Opening Hours" },
      { id: "tarieven",       emoji: "💶", label: "Rates" },
      { id: "toernooien",     emoji: "🏆", label: "Tournaments" },
      { id: "spelregels",     emoji: "📖", label: "Game Rules" },
      { id: "locatie",        emoji: "📍", label: "Location & Parking" },
      { id: "anders",         emoji: "❓", label: "Other" },
    ],
    questions: {
      pool: [
        "How many tables are available?",
        "Do I need to reserve?",
        "What's the difference between American and English pool?",
        "Can I bring my own cue?",
      ],
      darts: [
        "How much does an hour of darts cost?",
        "Do I need to bring my own darts?",
        "How many dartboards are there?",
        "Can I combine darts with pool?",
      ],
      openingstijden: [
        "When are you open?",
        "Are you open on public holidays?",
        "What's the last entry time?",
        "Are the weekend hours different?",
      ],
      tarieven: [
        "How much does an hour of pool cost?",
        "Are there day rates and evening rates?",
        "Can I pay by card?",
        "Are there group rates?",
      ],
      toernooien: [
        "When is the next tournament?",
        "Which tournaments are coming up next week?",
        "Are there tournaments for beginners?",
        "How much does it cost to participate?",
      ],
      spelregels: [
        "Explain the rules of 8-ball",
        "How do you play 9-ball?",
        "How does 501 darts work?",
        "What are the rules of billiards?",
      ],
      locatie: [
        "Where is Mokum located?",
        "How do I get there by public transport?",
        "Is there parking available?",
        "How far is it from Amstel Station?",
      ],
    },
    hoverInfo: [
      "🕐 Opening hours",
      "💶 Rates & activities",
      "🏆 Tournaments & sign-up",
      "📍 Route & parking",
      "🎯 Darts, billiards & more",
      "🏢 Corporate events",
    ],
    hoverTitle: "I KNOW ALL ABOUT:",
  },
}

export default translations