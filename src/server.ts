import express from "express";
import bodyParser from "body-parser";
import Contact from "./models/contacts";
import { Op } from "sequelize";

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res
      .status(400)
      .send({ error: "Email or phone number is required." });
  }

  let contacts = await Contact.findAll({
    where: {
      [Op.or]: [{ email }, { phoneNumber }],
    },
  });

  if (contacts.length === 0) {
    const newContact = await Contact.create({
      email,
      phoneNumber,
      linkPrecedence: "primary",
    });

    return res.status(200).send({
      contact: {
        primaryContatctId: newContact.id,
        emails: [newContact.email],
        phoneNumbers: [newContact.phoneNumber],
        secondaryContactIds: [],
      },
    });
  }

  let primaryContact = contacts.find(
    (contact) => contact.linkPrecedence === "primary"
  );
  if (!primaryContact) {
    primaryContact = contacts[0];
    primaryContact.linkPrecedence = "primary";
    await primaryContact.save();
  }

  const secondaryContacts = contacts.filter(
    (contact) => contact.id !== primaryContact.id
  );
  if (
    !secondaryContacts.some((contact) => contact.linkedId === primaryContact.id)
  ) {
    for (const contact of secondaryContacts) {
      contact.linkedId = primaryContact.id;
      contact.linkPrecedence = "secondary";
      await contact.save();
    }
  }

  if (email && !contacts.some((contact) => contact.email === email)) {
    await Contact.create({
      email,
      phoneNumber: null,
      linkPrecedence: "secondary",
      linkedId: primaryContact.id,
    });
  }

  if (
    phoneNumber &&
    !contacts.some((contact) => contact.phoneNumber === phoneNumber)
  ) {
    await Contact.create({
      email: null,
      phoneNumber,
      linkPrecedence: "secondary",
      linkedId: primaryContact.id,
    });
  }

  contacts = await Contact.findAll({
    where: {
      [Op.or]: [{ email }, { phoneNumber }],
    },
  });

  const response = {
    primaryContatctId: primaryContact.id,
    emails: contacts.map((contact) => contact.email).filter((email) => email),
    phoneNumbers: contacts
      .map((contact) => contact.phoneNumber)
      .filter((phoneNumber) => phoneNumber),
    secondaryContactIds: contacts
      .filter((contact) => contact.linkPrecedence === "secondary")
      .map((contact) => contact.id),
  };

  res.status(200).send({ contact: response });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
