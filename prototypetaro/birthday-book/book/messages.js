/* ==========================================================
   EDIT THIS FILE to change everything the site says.
   Keep the quotes "like this" and the commas between items.
   Use \n inside a message for a line break.
   ========================================================== */

const SITE = {
  // Browser tab title and the heading above the book
  title: "Happy Birthday, Taro",

  // ---------- THE COVER ----------
  // The cover shows the engraved picture (no writing).
  // coverMetal: "silver" or "gold"  (the engraving + frame colour)
  coverMetal: "silver",
  // Optional: use your own engraving file instead (leave "" to use the metal above).
  // Make one from any black & white picture with tools/make_engraving.py (see README).
  coverEngraving: "",
  coverHint: "Click the book to open",       // small text under the closed book
  coverAlt: "",     // read aloud by screen readers only

  // Background music (put your file in the assets folder). Leave "" for no music.
  music: "assets/music.mp3",

  // Typing speed in milliseconds per letter. Bigger = slower.
  // (Slow: 90   Medium: 60   Fast: 30)
  typingSpeed: 75,
  transmissionSpeed: 65,   // same, for the pop-up message

  // How long one page turn takes, in milliseconds. Bigger = slower and gentler.
  pageTurnSpeed: 1600,

  // A small confetti burst when the last pages open. true / false.
  // (There is no burst when the book is opened any more.)
  finaleConfetti: true,
  confettiColors: ["#CAF6FE", "#91C1E7", "#BDBED3", "#F5EFF0", "#D3B8C1", "#8F778F"],

  // ---------- STICKERS ----------
  // 1. Copy your sticker images into assets/stickers/
  //    (PNG with a see-through background looks best; SVG, JPG and GIF work too).
  // 2. List their file names here. Each one lands on a random page
  //    and a random spot near the edge, tilted a little.
  // 3. Reload the page. Change "seed" to any other number to shuffle them again.
  stickers: {
    files: [
      "assets/stickers/heart.svg",
      "assets/stickers/star.svg",
      "assets/stickers/balloon.svg",
      "assets/stickers/cake.svg"
    ],
    copies: 1,         // how many times each sticker is used
    maxPerPage: 2,     // at most this many stickers on one page
    size: 19,          // sticker size (% of the page width)
    outline: true,     // white sticker-style edge. Use false for plain images
    seed: 7            // change this number to shuffle the positions
  },

  // ---------- THE PAGES ----------
  // The book opens as a two-page spread: pages 1+2 are shown together, then 3+4, and so on.
  // Add or remove pages freely (an even number looks best).
  // "image" is optional: "assets/photo1.jpg" or "".
  // To place a sticker yourself on one page, add this line to it:
  //   stickers: [{ src: "assets/stickers/heart.svg", x: 80, y: 15, size: 20, rotate: -10 }],
  // (x and y are % from the left and top of the page.)
  pages: [
    {
      title: "Happy Birthday",
      text: "TAROOO ",
      image: ""
    },
    {
      title: "",
      text: "",
      image: ""
    },
    {
      title: "",
      text: "",
      image: ""
    },
    {
      title: "",
      text: "",
      image: ""
    },
    {
      title: "",
      text: "",
      image: ""
    },
    {
      title: "",
      text: "",
      image: ""
    },
    {
      title: "",
      text: "",
      image: ""
    },
    {
      title: "One last thing",
      text: "Happy birthday, one more gift from our artist",
      image: ""
    }
  ],

  // ---------- THE SECRET MESSAGE ----------
  // Shown in a pop-up window on the last page.
  transmission: {
    buttonText: "Open transmission",
    windowTitle: "Transmission from Farah",
    lines: [
      "for the ADO super fan.",
      "- Farah"
    ]
  }
};
