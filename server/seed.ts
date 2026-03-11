import { db } from "./db";
import { users, candidateProfiles } from "@shared/schema";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");
  
  // Create admin
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  await db.insert(users).values({
    email: "admin@fieldtrack.com",
    password: adminPassword,
    role: "ADMIN"
  }).onConflictDoNothing({ target: users.email });

  const states = ["Rajasthan", "Maharashtra", "Gujarat", "UP", "MP", "Bihar"];

  for (let i = 1; i <= 20; i++) {
    const email = `candidate${i}@fieldtrack.com`;
    const candidatePassword = await bcrypt.hash("Pass@1234", 10);
    
    try {
      const [user] = await db.insert(users).values({
        email,
        password: candidatePassword,
        role: "CANDIDATE"
      }).returning();

      await db.insert(candidateProfiles).values({
        userId: user.id,
        fullName: `Candidate Name ${i}`,
        age: 20 + (i % 10),
        state: states[i % states.length],
        phone: `+91 98765432${i.toString().padStart(2, '0')}`,
        address: `Address for candidate ${i}`,
        education: "Bachelor's Degree",
        bio: "Determined candidate looking for opportunities."
      });
    } catch (e) {
      // Ignore if user already exists
    }
  }

  console.log("Database seeded successfully.");
  process.exit(0);
}

seed().catch(console.error);