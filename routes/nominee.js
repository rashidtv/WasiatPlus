const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const VaultItem = require("../models/VaultItem");

/* ✅ ADD NOMINEE */
router.post("/:vaultId/add", auth, async (req, res) => {
    const { name, email, relationship, sharePercentage } = req.body;

    try {
        const item = await VaultItem.findOne({ _id: req.params.vaultId, user: req.user.id });
        if (!item) return res.status(404).json({ message: "Document not found" });

        item.nominees.push({
            name,
            email,
            relationship,
            sharePercentage
        });

        await item.save();
        res.json({ message: "Nominee added", nominees: item.nominees });

    } catch (err) {
        console.error("Add nominee error:", err);
        res.status(500).json({ message: "Server error adding nominee" });
    }
});

/* ✅ DELETE NOMINEE */
router.delete("/:vaultId/remove/:nomineeId", auth, async (req, res) => {
    try {
        const item = await VaultItem.findOne({ _id: req.params.vaultId, user: req.user.id });
        if (!item) return res.status(404).json({ message: "Document not found" });

        item.nominees = item.nominees.filter(n => n._id.toString() !== req.params.nomineeId);

        await item.save();
        res.json({ message: "Nominee removed", nominees: item.nominees });

    } catch (err) {
        console.error("Remove nominee error:", err);
        res.status(500).json({ message: "Server error removing nominee" });
    }
});

/* ✅ GET NOMINEES */
router.get("/:vaultId/list", auth, async (req, res) => {
    try {
        const item = await VaultItem.findOne(
            { _id: req.params.vaultId, user: req.user.id },
            { nominees: 1 }
        );

        if (!item) return res.status(404).json({ message: "Document not found" });

        res.json(item.nominees);

    } catch (err) {
        console.error("Get nominees error:", err);
        res.status(500).json({ message: "Server error getting nominees" });
    }
});

module.exports = router;