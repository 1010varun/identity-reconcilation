import Contact from "./models/contacts";
import "./server";

(async () => {
  await Contact.sync({ force: true });
  console.log("Database & tables created!");
})();
