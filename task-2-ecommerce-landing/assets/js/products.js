/* Product catalogue (demo data — fictional shop).
 * shape    : drawing used by ceramics.js (plate, oval, bowl, vase, mug, tajine)
 * pattern  : decoration painted on the piece
 * colors   : glaze variants — a = main glaze, b = painted pattern
 */
window.PRODUCTS = [
  {
    id: "jasmin-plate", name: "Assiette « Jasmin »", category: "assiettes", shape: "plate", pattern: "flower",
    price: 38, oldPrice: 45, rating: 4.9, reviews: 128, popularity: 98, added: "2026-09-02", badge: "promo",
    description: "Assiette plate de 26 cm peinte à la main d'une fleur de jasmin, le symbole de la Tunisie. Émail sans plomb, compatible lave-vaisselle.",
    colors: [
      { name: "Bleu de Nabeul", a: "#1f4e8c", b: "#e9b44c" },
      { name: "Terracotta", a: "#c2562f", b: "#1f4e8c" },
      { name: "Vert olive", a: "#5f7a35", b: "#f4e9d8" },
    ],
  },
  {
    id: "medina-plate", name: "Assiette « Médina »", category: "assiettes", shape: "plate", pattern: "star",
    price: 32, rating: 4.7, reviews: 86, popularity: 80, added: "2026-06-11",
    description: "Étoile à huit branches inspirée des portes de la médina. Diamètre 24 cm, idéale pour le dessert ou les entrées.",
    colors: [
      { name: "Cobalt", a: "#23408e", b: "#f4e9d8" },
      { name: "Turquoise", a: "#1d8a8a", b: "#f4e9d8" },
    ],
  },
  {
    id: "nabeul-dish", name: "Plat de service « Nabeul »", category: "assiettes", shape: "oval", pattern: "dots",
    price: 54, rating: 4.8, reviews: 41, popularity: 74, added: "2026-10-01", badge: "new",
    description: "Grand plat ovale (38 × 26 cm) pour le couscous du vendredi. Décor de perles peint au pinceau fin.",
    colors: [
      { name: "Jaune safran", a: "#d99a1e", b: "#23408e" },
      { name: "Bleu de Nabeul", a: "#1f4e8c", b: "#e9b44c" },
    ],
  },
  {
    id: "sidibou-bowl", name: "Bol « Sidi Bou »", category: "bols", shape: "bowl", pattern: "zigzag",
    price: 24, rating: 4.9, reviews: 203, popularity: 100, added: "2026-03-20", badge: "best",
    description: "Le bol blanc et bleu de Sidi Bou Saïd, pour la chorba ou les céréales du matin. 14 cm, 450 ml.",
    colors: [
      { name: "Bleu Sidi Bou", a: "#2a64b8", b: "#f4e9d8" },
      { name: "Blanc chaux", a: "#efe7d8", b: "#2a64b8" },
    ],
  },
  {
    id: "hammamet-bowl", name: "Bol à soupe « Hammamet »", category: "bols", shape: "bowl", pattern: "wave",
    price: 28, oldPrice: 33, rating: 4.6, reviews: 57, popularity: 70, added: "2026-08-14", badge: "promo",
    description: "Bol profond orné de vagues, en souvenir des plages d'Hammamet. 16 cm, 600 ml.",
    colors: [
      { name: "Turquoise", a: "#1d8a8a", b: "#f4e9d8" },
      { name: "Terracotta", a: "#c2562f", b: "#f4e9d8" },
    ],
  },
  {
    id: "kerkennah-vase", name: "Vase « Kerkennah »", category: "vases", shape: "vase", pattern: "wave",
    price: 65, rating: 4.8, reviews: 34, popularity: 66, added: "2026-10-12", badge: "new",
    description: "Vase pansu de 28 cm, tourné à la main. Ses vagues rappellent la mer calme des îles Kerkennah.",
    colors: [
      { name: "Vert olive", a: "#5f7a35", b: "#f4e9d8" },
      { name: "Cobalt", a: "#23408e", b: "#e9b44c" },
    ],
  },
  {
    id: "dar-vase", name: "Grand vase « Dar »", category: "vases", shape: "vase", pattern: "zigzag",
    price: 89, rating: 5.0, reviews: 19, popularity: 60, added: "2026-07-05",
    description: "Pièce maîtresse de 40 cm pour l'entrée de la maison (dar). Chaque vase est unique.",
    colors: [
      { name: "Terracotta", a: "#c2562f", b: "#1f2a44" },
      { name: "Noir de fumée", a: "#2b2b33", b: "#e9b44c" },
    ],
  },
  {
    id: "qahwa-cup", name: "Tasse « Qahwa »", category: "tasses", shape: "mug", pattern: "dots",
    price: 18, rating: 4.7, reviews: 151, popularity: 92, added: "2026-05-28",
    description: "Petite tasse pour le café turc ou le thé à la menthe. 120 ml, vendue à l'unité.",
    colors: [
      { name: "Jaune safran", a: "#d99a1e", b: "#1f4e8c" },
      { name: "Bleu de Nabeul", a: "#1f4e8c", b: "#f4e9d8" },
      { name: "Terracotta", a: "#c2562f", b: "#f4e9d8" },
    ],
  },
  {
    id: "oasis-mug", name: "Mug « Oasis »", category: "tasses", shape: "mug", pattern: "zigzag",
    price: 22, oldPrice: 26, rating: 4.5, reviews: 72, popularity: 78, added: "2026-09-19", badge: "promo",
    description: "Grand mug de 330 ml décoré comme les palmeraies de Tozeur. Anse confortable.",
    colors: [
      { name: "Vert olive", a: "#5f7a35", b: "#e9b44c" },
      { name: "Turquoise", a: "#1d8a8a", b: "#f4e9d8" },
    ],
  },
  {
    id: "capbon-tajine", name: "Tajine « Cap Bon »", category: "tajines", shape: "tajine", pattern: "flower",
    price: 75, rating: 4.9, reviews: 64, popularity: 84, added: "2026-10-18", badge: "new",
    description: "Tajine de service de 30 cm, couvercle conique peint à la main. Pour servir à table (non adapté à la flamme).",
    colors: [
      { name: "Terracotta", a: "#c2562f", b: "#e9b44c" },
      { name: "Bleu de Nabeul", a: "#1f4e8c", b: "#e9b44c" },
    ],
  },
];

window.CATEGORIES = {
  all: "Tout",
  assiettes: "Assiettes & plats",
  bols: "Bols",
  vases: "Vases",
  tasses: "Tasses & mugs",
  tajines: "Tajines",
};
