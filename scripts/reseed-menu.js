/**
 * scripts/reseed-menu.js
 * Run with: node scripts/reseed-menu.js
 */

import { readFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const serviceAccount = JSON.parse(readFileSync("serviceacc.json", "utf-8"));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// Helper to determine image based on name/category
function getImage(name, category) {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  
  if (n.includes("biriyani") || n.includes("biryani")) {
    if (n.includes("bucket")) return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&q=80";
    return "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=500&q=80";
  }
  if (n.includes("fried rice")) return "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=500&q=80";
  if (c.includes("gravy") || n.includes("manchurian") || n.includes("chettinad") || n.includes("chilli")) {
    if (n.includes("omlette") || n.includes("podimas") || n.includes("egg")) return "https://images.unsplash.com/photo-1510693061456-43b9df72d3f3?w=500&q=80";
    return "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=500&q=80";
  }
  if (n.includes("65") || n.includes("lollipop") || n.includes("crab") || n.includes("wing")) {
    return "https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=500&q=80";
  }
  if (n.includes("finger") || n.includes("nugget")) {
    return "https://images.unsplash.com/photo-1562967914-608f82629710?w=500&q=80";
  }
  if (c.includes("bun") || n.includes("bun")) return "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80";
  if (c.includes("toast") || c.includes("sandwich")) return "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80";
  if (c.includes("fries")) return "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&q=80";
  if (c.includes("maggi") || n.includes("maggi")) return "https://images.unsplash.com/photo-1612929633738-8fe01f7c8166?w=500&q=80";
  if (c.includes("mojito")) return "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&q=80";
  if (n.includes("momo")) return "https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=500&q=80";
  if (n.includes("roll")) return "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=500&q=80";
  
  return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80"; // fallback food
}

const DISHES = [
  // ── Main Dish ──────────────────────────────────────────────────────────────
  { name: "Chicken Biriyani (M)",                  description: "Medium portion of our signature chicken biryani",                   price: 150,  category: "Main Dish",               availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken 65 Biriyani (M)",               description: "Medium Chicken 65 Biryani — spicy & crispy",                       price: 170,  category: "Main Dish",               availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Biriyani (L)",                  description: "Large portion of our signature chicken biryani",                    price: 200,  category: "Main Dish",               availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Biriyani (XL)",                 description: "Extra-large chicken biryani for a hearty appetite",                 price: 260,  category: "Main Dish",               availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken 65 Biriyani (L)",               description: "Large Chicken 65 Biryani — bold & spicy",                          price: 230,  category: "Main Dish",               availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken 65 Biriyani (XL)",              description: "Extra-large Chicken 65 Biryani",                                    price: 290,  category: "Main Dish",               availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Fried Rice ─────────────────────────────────────────────────────────────
  { name: "Chicken Fried Rice",                    description: "Wok-tossed rice with tender chicken pieces",                       price: 130,  category: "Fried Rice",              availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Paneer Fried Rice",                     description: "Aromatic fried rice with soft paneer cubes",                       price: 170,  category: "Fried Rice",              availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Egg Fried Rice",                        description: "Classic fried rice with scrambled egg",                            price: 120,  category: "Fried Rice",              availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Veg Fried Rice",                        description: "Healthy mixed vegetable fried rice",                               price: 120,  category: "Fried Rice",              availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Gobi Fried Rice",                       description: "Fried rice with spiced cauliflower",                               price: 130,  category: "Fried Rice",              availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Bucket Biryani Combos ──────────────────────────────────────────────────
  { name: "Family Bucket Biryani Chicken (4–5)",   description: "Perfect family combo — serves 4 to 5 people",                     price: 1050, category: "Bucket Biryani Combos",   availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Joint Family Bucket Biryani (6–7)",     description: "Bumper bucket — serves 6 to 7 people",                            price: 1490, category: "Bucket Biryani Combos",   availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Gravy / Fry ────────────────────────────────────────────────────────────
  { name: "Chilli Chicken",                        description: "Crispy chicken tossed in spicy chilli sauce",                     price: 160,  category: "Gravy / Fry",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Manchurian",                    description: "Chicken in tangy Manchurian gravy",                               price: 160,  category: "Gravy / Fry",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Gobi Manchurian",                       description: "Crispy cauliflower in Manchurian sauce",                          price: 140,  category: "Gravy / Fry",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Chettinad",                     description: "Rich Chettinad-style chicken curry",                              price: 170,  category: "Gravy / Fry",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Pepper Chicken",                        description: "Succulent chicken with cracked black pepper",                     price: 170,  category: "Gravy / Fry",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Omlette",                               description: "Classic fresh egg omelette",                                      price: 20,   category: "Gravy / Fry",             availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },

  // ── Starters Mini ──────────────────────────────────────────────────────────
  { name: "Fish Finger Mini (3 pcs)",              description: "Crispy golden fish fingers — 3 pieces",                           price: 170,  category: "Starters / Mini",         availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Finger Mini (3 pcs)",           description: "Juicy chicken fingers — 3 pieces",                               price: 160,  category: "Starters / Mini",         availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Wings Mini (2 pcs)",            description: "Flavourful chicken wings — 2 pieces",                            price: 120,  category: "Starters / Mini",         availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Starters Regular ───────────────────────────────────────────────────────
  { name: "Egg Podimas (Regular)",                 description: "Spiced scrambled egg stir-fry",                                   price: 60,   category: "Starters / Regular",      availability: { breakfast: true,  lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken 65 (Regular)",                  description: "Classic deep-fried spicy Chicken 65",                            price: 80,   category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken 65 Boneless (Regular)",         description: "Boneless Chicken 65 — easy to eat",                              price: 100,  category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Lollipop Dry (5 pcs)",          description: "Crispy dry chicken lollipops — 5 pieces",                        price: 150,  category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Saucy Lollipop (5 pcs)",        description: "Saucy glazed chicken lollipops — 5 pieces",                      price: 200,  category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Crab Lollipop (5 pcs)",                 description: "Crispy crab lollipops — 5 pieces",                               price: 260,  category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Fish Finger (5 pcs)",                   description: "Golden fish fingers — 5 pieces",                                 price: 250,  category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Finger (5 pcs)",                description: "Juicy chicken fingers — 5 pieces",                               price: 200,  category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Wings (4 pcs)",                 description: "Flavourful chicken wings — 4 pieces",                            price: 200,  category: "Starters / Regular",      availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Starters Large ─────────────────────────────────────────────────────────
  { name: "Egg Podimas (Large)",                   description: "Large spiced scrambled egg stir-fry",                             price: 90,   category: "Starters / Large",        availability: { breakfast: true,  lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken 65 (Large)",                    description: "Large Chicken 65 serving",                                       price: 120,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken 65 Boneless (Large)",           description: "Large boneless Chicken 65",                                      price: 150,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Lollipop Dry (8 pcs)",          description: "Crispy dry chicken lollipops — 8 pieces",                        price: 220,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Saucy Lollipop (8 pcs)",        description: "Saucy glazed chicken lollipops — 8 pieces",                      price: 300,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Crab Lollipop (8 pcs)",                 description: "Crispy crab lollipops — 8 pieces",                               price: 390,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Fish Finger (8 pcs)",                   description: "Golden fish fingers — 8 pieces",                                 price: 370,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Finger (8 pcs)",                description: "Juicy chicken fingers — 8 pieces",                               price: 320,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Wings (8 pcs)",                 description: "Flavourful chicken wings — 8 pieces",                            price: 390,  category: "Starters / Large",        availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Bun ────────────────────────────────────────────────────────────────────
  { name: "Bun Butter Jam",                        description: "Soft bun with butter and strawberry jam",                        price: 50,   category: "Bun",                     availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Butter Bun",                            description: "Soft bun with creamy butter",                                    price: 50,   category: "Bun",                     availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Chocolate Bun",                         description: "Bun with a rich chocolate filling",                              price: 60,   category: "Bun",                     availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Jam Bun",                               description: "Soft bun filled with sweet jam",                                 price: 40,   category: "Bun",                     availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },

  // ── Bread Toast ────────────────────────────────────────────────────────────
  { name: "Butter Jam Toast",                      description: "Crispy toast with butter and jam",                               price: 40,   category: "Bread Toast",             availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Peanut Butter Toast",                   description: "Crunchy toast with natural peanut butter",                       price: 80,   category: "Bread Toast",             availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Peanut Butter Jam Toast",               description: "Toast with peanut butter and jam",                               price: 70,   category: "Bread Toast",             availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },

  // ── Bread Omelette ─────────────────────────────────────────────────────────
  { name: "Bread Omelette",                        description: "Fresh omelette sandwiched in soft bread",                        price: 50,   category: "Bread Omelette",          availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Cheese Bread Omelette",                 description: "Cheesy omelette in soft bread",                                  price: 70,   category: "Bread Omelette",          availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },

  // ── Fries ──────────────────────────────────────────────────────────────────
  { name: "French Fries",                          description: "Golden crispy French fries",                                     price: 70,   category: "Fries",                   availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Peri-Peri French Fries",               description: "Fries tossed in tangy Peri-Peri seasoning",                     price: 80,   category: "Fries",                   availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Sandwich ───────────────────────────────────────────────────────────────
  { name: "Veg Sandwich",                          description: "Classic grilled vegetable sandwich",                             price: 60,   category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },
  { name: "Cheese Sandwich",                       description: "Melted cheese grilled sandwich",                                 price: 80,   category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },
  { name: "Chilli Cheese Sandwich",               description: "Spicy chilli with melted cheese",                               price: 75,   category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },
  { name: "Veg Club Sandwich",                    description: "Layered club sandwich with fresh vegetables",                    price: 90,   category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },
  { name: "Chocolate Sandwich",                   description: "Sweet chocolate spread grilled sandwich",                        price: 80,   category: "Sandwich",                availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Paneer Sandwich",                      description: "Spiced paneer grilled in soft bread",                           price: 95,   category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },
  { name: "Paneer Cheese Sandwich",               description: "Paneer and melted cheese sandwich",                              price: 115,  category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },
  { name: "Egg Sandwich",                         description: "Egg-filled grilled sandwich",                                    price: 95,   category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },
  { name: "Egg Cheese Sandwich",                  description: "Egg and cheese melted sandwich",                                 price: 110,  category: "Sandwich",                availability: { breakfast: true,  lunch: true,  dinner: false }, isAvailable: true },

  // ── Maggi ──────────────────────────────────────────────────────────────────
  { name: "Plain Maggi",                           description: "Classic Maggi noodles",                                          price: 45,   category: "Maggi",                   availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Veg Maggi",                             description: "Maggi noodles loaded with fresh vegetables",                    price: 55,   category: "Maggi",                   availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Egg Maggi",                             description: "Maggi noodles with egg",                                        price: 65,   category: "Maggi",                   availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },
  { name: "Veg Cheese Maggi",                      description: "Maggi noodles with vegetables and melted cheese",               price: 80,   category: "Maggi",                   availability: { breakfast: true,  lunch: false, dinner: false }, isAvailable: true },

  // ── Mojito ─────────────────────────────────────────────────────────────────
  { name: "Lemon Soda Mojito",                     description: "Refreshing lemon soda mojito",                                   price: 55,   category: "Mojito",                  availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Strawberry Mojito",                     description: "Sweet strawberry mojito",                                        price: 75,   category: "Mojito",                  availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Ginger Lime Mojito",                    description: "Zesty ginger lime mojito",                                       price: 70,   category: "Mojito",                  availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Blue Curacao Mojito",                   description: "Exotic blue curacao mojito",                                     price: 75,   category: "Mojito",                  availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Lime Mint Mojito",                      description: "Classic lime mint mojito",                                       price: 75,   category: "Mojito",                  availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },

  // ── Quick Bites ────────────────────────────────────────────────────────────
  { name: "Paneer Roll (2 pcs)",                   description: "Spiced paneer wrapped in soft roll — 2 pieces",                  price: 60,   category: "Quick Bites",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Fried Momos (6 pcs)",           description: "Crispy fried chicken momos — 6 pieces",                         price: 125,  category: "Quick Bites",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Fried Peri-Peri Momos (6 pcs)", description: "Chicken momos with Peri-Peri seasoning — 6 pieces",            price: 135,  category: "Quick Bites",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Mixed Veg Fried Momos (6 pcs)",         description: "Crispy mixed vegetable momos — 6 pieces",                       price: 125,  category: "Quick Bites",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Mixed Veg Peri-Peri Momos (6 pcs)",     description: "Veg momos with Peri-Peri seasoning — 6 pieces",                price: 135,  category: "Quick Bites",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Chicken Nuggets (6 pcs)",               description: "Golden crispy chicken nuggets — 6 pieces",                      price: 125,  category: "Quick Bites",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
  { name: "Cheese Corn Nuggets (6 pcs)",           description: "Crunchy cheese corn nuggets — 6 pieces",                        price: 125,  category: "Quick Bites",             availability: { breakfast: false, lunch: true,  dinner: true  }, isAvailable: true },
];

async function seed() {
  console.log(`\nDeleting existing menu...`);
  const snap = await db.collection("menu").get();
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  console.log(`Deleted ${snap.size} items.`);

  console.log(`\nSeeding ${DISHES.length} dishes to Firestore with images...\n`);
  let count = 0;
  for (const dish of DISHES) {
    const imageUrl = getImage(dish.name, dish.category);
    await db.collection("menu").add({ ...dish, imageUrl, createdAt: FieldValue.serverTimestamp() });
    count++;
    process.stdout.write(`  [${count}/${DISHES.length}] ${dish.name}\n`);
  }
  console.log(`\n✅ Done! ${count} dishes added to /menu\n`);
  process.exit(0);
}

seed().catch((err) => { console.error("❌ Seed failed:", err); process.exit(1); });
