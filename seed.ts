import "dotenv/config";
import { db } from "./server/db";
import { users, candidateProfiles } from "@shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const seedUsers = [
  {
    email: "admin@fieldtrack.com",
    password: "Admin@123",
    role: "ADMIN" as const,
    name: "Admin",
    state: null as string | null,
    phone: null as string | null,
    age: null as number | null,
  },
  {
    email: "candidate1@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Rahul Sharma",
    state: "Rajasthan",
    phone: "9810001001",
    age: 24,
  },
  {
    email: "candidate2@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Priya Verma",
    state: "Maharashtra",
    phone: "9810001002",
    age: 23,
  },
  {
    email: "candidate3@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Amit Singh",
    state: "Gujarat",
    phone: "9810001003",
    age: 25,
  },
  {
    email: "candidate4@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Neha Patel",
    state: "Uttar Pradesh",
    phone: "9810001004",
    age: 22,
  },
  {
    email: "candidate5@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Ravi Kumar",
    state: "Madhya Pradesh",
    phone: "9810001005",
    age: 26,
  },
  {
    email: "candidate6@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Sunita Devi",
    state: "Bihar",
    phone: "9810001006",
    age: 24,
  },
  {
    email: "candidate7@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Vikram Yadav",
    state: "Rajasthan",
    phone: "9810001007",
    age: 27,
  },
  {
    email: "candidate8@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Kavita Joshi",
    state: "Maharashtra",
    phone: "9810001008",
    age: 23,
  },
  {
    email: "candidate9@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Deepak Mishra",
    state: "Gujarat",
    phone: "9810001009",
    age: 25,
  },
  {
    email: "candidate10@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Pooja Tiwari",
    state: "Uttar Pradesh",
    phone: "9810001010",
    age: 22,
  },
  {
    email: "candidate11@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Suresh Rawat",
    state: "Madhya Pradesh",
    phone: "9810001011",
    age: 28,
  },
  {
    email: "candidate12@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Anita Chauhan",
    state: "Bihar",
    phone: "9810001012",
    age: 24,
  },
  {
    email: "candidate13@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Manoj Gupta",
    state: "Rajasthan",
    phone: "9810001013",
    age: 26,
  },
  {
    email: "candidate14@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Rekha Nair",
    state: "Maharashtra",
    phone: "9810001014",
    age: 23,
  },
  {
    email: "candidate15@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Ajay Pandey",
    state: "Gujarat",
    phone: "9810001015",
    age: 25,
  },
  {
    email: "candidate16@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Meena Kumari",
    state: "Uttar Pradesh",
    phone: "9810001016",
    age: 22,
  },
  {
    email: "candidate17@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Rohit Bhatt",
    state: "Madhya Pradesh",
    phone: "9810001017",
    age: 27,
  },
  {
    email: "candidate18@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Shalini Singh",
    state: "Bihar",
    phone: "9810001018",
    age: 24,
  },
  {
    email: "candidate19@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Dinesh Agarwal",
    state: "Rajasthan",
    phone: "9810001019",
    age: 26,
  },
  {
    email: "candidate20@fieldtrack.com",
    password: "Pass@1234",
    role: "CANDIDATE" as const,
    name: "Preeti Saxena",
    state: "Maharashtra",
    phone: "9810001020",
    age: 23,
  },
];

async function seed() {
  console.log("Starting permanent seed...");

  for (const u of seedUsers) {
    try {
      const hashed = await bcrypt.hash(u.password, 10);

      // UPSERT — create if not exists, skip if already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, u.email));

      if (existing.length > 0) {
        console.log("Already exists, skipping: " + u.email);
        continue;
      }

      const [created] = await db
        .insert(users)
        .values({
          email: u.email,
          password: hashed,
          role: u.role,
        })
        .returning();

      if (u.role === "CANDIDATE") {
        await db.insert(candidateProfiles).values({
          userId: created.id,
          fullName: u.name,
          state: u.state || "",
          phone: u.phone || undefined,
          age: u.age || undefined,
        });
      }
      console.log("Created: " + u.email);
    } catch (error) {
      console.error("Error seeding user " + u.email + ":", error);
    }
  }

  const [result] = await db.select().from(users);
  const total = result ? (await db.select().from(users)).length : 0;
  console.log("Total users in database: " + total);
  console.log("SEED COMPLETE — data is permanently saved.");

  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
