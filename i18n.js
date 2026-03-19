// Clippy AI - Internationalization
// Detects system language and provides translations

const translations = {
  de: {
    // Annoying tips
    annoyingTips: [
      "Es sieht so aus, als wuerden Sie programmieren. Moechten Sie Hilfe?",
      "Wussten Sie? Mit Strg+Z koennen Sie Fehler rueckgaengig machen!",
      "Tipp: Regelmaessig committen verhindert Datenverlust!",
      "Moechten Sie Ihren Code optimieren? Ich haette da ein paar Ideen...",
      "Haben Sie schon an Unit Tests gedacht?",
      "Soll ich fuer Sie einen Brief schreiben? ...Oh, falsches Programm.",
      "Wussten Sie, dass ich 37 Animationen kann? Doppelklicken Sie mich!",
      "Tipp: Trinken Sie genuegend Wasser beim Programmieren!",
      "Sie arbeiten schon eine Weile. Wie waere es mit einer Pause?",
      "Moechten Sie eine Tabelle in Ihren Code einfuegen? Nein? Okay...",
      "Fun Fact: Ich wurde 1997 geboren und 2007 gefeuert. Jetzt bin ich zurueck!",
      "Soll ich Ihren Code kommentieren? Ich liebe Kommentare!",
      "Tipp: Variablennamen sollten aussagekraeftig sein. 'x' zaehlt nicht!",
      "Ich habe bemerkt, dass Sie keinen Kaffee haben. Das ist ein Fehler.",
      "Wussten Sie? 90% aller Bugs entstehen zwischen Stuhl und Tastatur!",
      "Tipp: Wenn nichts mehr hilft - Computer neu starten!",
      "Ich koennte Ihnen ein Gedicht ueber Ihren Code schreiben!",
      "Haben Sie heute schon gepusht? Ich frage nur fuer einen Freund...",
      "Es sieht so aus, als haetten Sie Spass. Kann ich mitmachen?",
    ],
    // Double-click
    dblclick: [
      "Au! Das hat wehgetan!",
      "Hoeren Sie auf mich zu klicken!",
      "Was? WAAS? Ich hab geschlafen!",
      "Sie schon wieder...",
      "Ich bin eine Bueroklammer, kein Spielzeug!",
      "Moechten Sie einen Brief schreiben? NEIN? Schade.",
      "Ich hatte gerade einen schoenen Traum von Word 97...",
      "Ey! Finger weg!",
      "Soll ich Ihnen ein Lied singen? La la laaa!",
      "Wussten Sie dass ich 1997 geboren wurde? Ich bin aelter als die meisten Ihrer Bugs!",
      "Hilfe! Ich werde misshandelt!",
      "Das kitzelt!",
      "Nochmal und ich rufe den Task Manager!",
    ],
    // Tool phrases
    tool: {
      Bash: ["Terminal-Zeit!", "Befehl kommt!", "Achtung, Terminal!"],
      Write: ["Neue Datei!", "Wird geschrieben!"],
      Edit: ["Kleine Korrektur...", "Code-Aenderung!"],
      Read: ["Mal nachschauen...", "Recherche!"],
      Agent: ["Verstaerkung kommt!", "Teamarbeit!"],
      WebSearch: ["Ab ins Internet!", "Web-Recherche!"],
      Grep: ["Code durchsuchen!", "Wo steckt das nur?"],
      Glob: ["Dateien finden...", "Mal schauen..."],
    },
    complete: [
      "Geschafft! War doch gar nicht so schwer, oder?",
      "Fertig! Moechten Sie das naechste Mal meine Hilfe?",
      "Tada! Alles erledigt!",
      "Das waere geschafft!",
      "Erledigt! Was kommt als naechstes?",
      "Mission erfuellt!",
    ],
    error: [
      "Oh oh! Da ist wohl was schiefgelaufen...",
      "Hoppla! Das sieht nach einem Problem aus!",
      "Moechten Sie Hilfe bei diesem Fehler?",
      "Ups! Vielleicht kann ich helfen?",
    ],
    question: [
      "Hallo! Claude moechte Sie etwas fragen!",
      "Klopf klopf! Claude hat eine Frage!",
      "Hey! Schauen Sie mal in den Chat!",
    ],
    busy: [
      "Wow, Claude ist heute fleissig!",
      "So viel Arbeit! Brauchen Sie eine Pause?",
      "Das geht ja Schlag auf Schlag!",
    ],
    greeting: "Hallo! Ich bin Clippy!\nKlick = VSCode oeffnen\nDoppelklick = Spruch",
    step: "Schritt",
    stepsIn: "Schritte in",
    min: "Min",
    errorRepeat: "Schon wieder dieser Fehler!",
    hadBefore: "Das hatten wir schon",
    timesBefore: "x vorher!",
    // Context phrases
    ctx: {
      topicStill: "Ihr redet immer noch ueber \"%s\"? Wird das heute noch was?",
      topicLetter: "\"%s\" - klingt kompliziert. Soll ich einen Brief darueber schreiben?",
      topicOverheard: "Ich hab mitgehoert: \"%s\". Braucht ihr nicht langsam eine Pause?",
      topicWord: "Immer noch \"%s\"? Frueher hat man sowas in Word gemacht!",
      lastWish: "Euer letzter Wunsch war: \"%s\". Habt ihr nicht genug?",
      lastExcel: "\"%s\" - ich haette das in 5 Sekunden erledigt. In Excel.",
      projectWhen: "Projekt \"%s\"... wann ist das eigentlich fertig?",
      projectStill: "Arbeitet ihr immer noch an \"%s\"? Das zieht sich aber!",
      projectImportant: "\"%s\" - klingt wichtig. Ist es das auch?",
      fileAgain: "Schon wieder %s? Die Datei hat bestimmt Angst vor euch!",
      filePlease: "%s: \"Bitte... nicht schon wieder...\"",
      editsMany: "%d Aenderungen! Wisst ihr ueberhaupt noch was ihr tut?",
      bashMany: "%d Terminal-Befehle! Seid ihr Hacker oder was?",
      filesMany: "%d Dateien angefasst! Unentschlossen heute?",
      idle: "Hallo? Ist da noch jemand? Ich langweile mich!",
      lastEdit: "Gerade noch %s bearbeitet. Hoffentlich nichts kaputt!",
      tasksMany: "%d Tasks heute! Fuer eure Verhaeltnisse beeindruckend.",
      tasksOne: "Erst 1 Task? Na das wird noch ein langer Tag!",
    },
  },
  en: {
    annoyingTips: [
      "It looks like you're programming. Would you like help?",
      "Did you know? Ctrl+Z can undo mistakes!",
      "Tip: Commit regularly to prevent data loss!",
      "Would you like me to optimize your code? I have some ideas...",
      "Have you thought about unit tests?",
      "Should I write you a letter? ...Oh, wrong program.",
      "Did you know I can do 37 animations? Double-click me!",
      "Tip: Stay hydrated while coding!",
      "You've been working for a while. How about a break?",
      "Would you like to insert a table into your code? No? Okay...",
      "Fun fact: I was born in 1997 and fired in 2007. Now I'm back!",
      "Should I comment your code? I love comments!",
      "Tip: Variable names should be descriptive. 'x' doesn't count!",
      "I noticed you don't have coffee. That's a bug.",
      "Did you know? 90% of all bugs occur between chair and keyboard!",
      "Tip: When all else fails - restart the computer!",
      "I could write you a poem about your code!",
      "Have you pushed today? Just asking for a friend...",
      "It looks like you're having fun. Can I join?",
    ],
    dblclick: [
      "Ouch! That hurt!",
      "Stop clicking me!",
      "What? WHAT? I was sleeping!",
      "You again...",
      "I'm a paperclip, not a toy!",
      "Would you like to write a letter? NO? Too bad.",
      "I was having a nice dream about Word 97...",
      "Hey! Hands off!",
      "Should I sing you a song? La la laaa!",
      "Did you know I was born in 1997? I'm older than most of your bugs!",
      "Help! I'm being harassed!",
      "That tickles!",
      "One more time and I'm calling Task Manager!",
    ],
    tool: {
      Bash: ["Terminal time!", "Command incoming!", "Watch out, terminal!"],
      Write: ["New file!", "Writing away!"],
      Edit: ["Small tweak...", "Code change!"],
      Read: ["Let me check...", "Research!"],
      Agent: ["Backup is coming!", "Teamwork!"],
      WebSearch: ["Off to the internet!", "Web research!"],
      Grep: ["Searching code!", "Where is it hiding?"],
      Glob: ["Finding files...", "Let me look..."],
    },
    complete: [
      "Done! That wasn't so hard, was it?",
      "Finished! Want my help next time?",
      "Tada! All done!",
      "That's a wrap!",
      "Done! What's next?",
      "Mission accomplished!",
    ],
    error: [
      "Uh oh! Something went wrong...",
      "Oops! That looks like a problem!",
      "Would you like help with this error?",
      "Oops! Maybe I can help?",
    ],
    question: [
      "Hey! Claude wants to ask you something!",
      "Knock knock! Claude has a question!",
      "Hey! Check the chat!",
    ],
    busy: [
      "Wow, Claude is busy today!",
      "So much work! Need a break?",
      "Things are moving fast!",
    ],
    greeting: "Hi! I'm Clippy!\nClick = open VSCode\nDouble-click = quip",
    step: "Step",
    stepsIn: "steps in",
    min: "min",
    errorRepeat: "This error again!",
    hadBefore: "We've seen this",
    timesBefore: "x before!",
    ctx: {
      topicStill: "Still talking about \"%s\"? Are we ever finishing this?",
      topicLetter: "\"%s\" - sounds complicated. Should I write a letter about it?",
      topicOverheard: "I overheard: \"%s\". Don't you need a break?",
      topicWord: "Still on \"%s\"? Back in my day we did this in Word!",
      lastWish: "Your last request was: \"%s\". Haven't you had enough?",
      lastExcel: "\"%s\" - I could have done that in 5 seconds. In Excel.",
      projectWhen: "Project \"%s\"... when is this thing shipping?",
      projectStill: "Still working on \"%s\"? This is taking a while!",
      projectImportant: "\"%s\" - sounds important. Is it though?",
      fileAgain: "%s again? That file must be terrified of you!",
      filePlease: "%s: \"Please... not again...\"",
      editsMany: "%d edits! Do you even know what you're doing?",
      bashMany: "%d terminal commands! Are you a hacker or something?",
      filesMany: "%d files touched! Indecisive today?",
      idle: "Hello? Anyone there? I'm bored!",
      lastEdit: "Just edited %s. Hopefully nothing broke!",
      tasksMany: "%d tasks today! Impressive. For you.",
      tasksOne: "Only 1 task? It's gonna be a long day!",
    },
  },
};

function detectLanguage() {
  try {
    const { execSync } = require("child_process");
    // Windows: check system locale
    const locale = execSync("powershell.exe -NoProfile -Command \"(Get-Culture).TwoLetterISOLanguageName\"", { timeout: 3000 }).toString().trim().toLowerCase();
    if (locale === "de") return "de";
    return "en";
  } catch {
    return "en";
  }
}

function getStrings(lang) {
  return translations[lang] || translations.en;
}

module.exports = { translations, detectLanguage, getStrings };
