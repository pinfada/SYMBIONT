const { MongoClient } = require('mongodb');

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'symbiont';

const rituals = [
  {
    _id: "SYMBIOSE",
    type: "code_secret",
    label: "Symbiose",
    description: "Déclenche une mutation symbiotique.",
    effects: {
      mutation: true,
      badge: "Symbiote",
      murmure: "Un pacte secret relie deux organismes..."
    },
    active: true
  },
  {
    _id: "AWAKEN",
    type: "code_secret",
    label: "Awaken",
    description: "Déclenche le rituel de réveil collectif.",
    effects: {
      animation: "wake",
      murmure: "Le réseau s'éveille d'un même souffle…"
    },
    active: true
  },
  {
    _id: "MUTATE",
    type: "code_secret",
    label: "Mutate",
    description: "Déclenche une mutation aléatoire.",
    effects: {
      mutation: true,
      murmure: "Un frisson de mutation traverse votre être..."
    },
    active: true
  }
];

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection('rituals');

  // Supprime les rituels existants (optionnel)
  await col.deleteMany({});
  // Insère les nouveaux rituels
  await col.insertMany(rituals);

  console.log('Rituels/codes secrets initialisés avec succès !');
  await client.close();
}

main().catch(err => {
  console.error('Erreur lors de l\'initialisation :', err);
  process.exit(1);
}); 