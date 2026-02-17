import Branch from "../models/branch.model.js"

export const createBranch = async (req, res) => {
  const userId = req.userId; 
  if (!req.body.name) return res.status(400).json({ message: "Branch name required" });

  const branch = await Branch.create({ userId, name: req.body.name });
  res.status(201).json(branch);  
};


export const editBranch = async (req, res) => {
  try {
    const userId = req.userId;
    
    const branchId = req.params.id;

    // Build update object dynamically - only include fields that are provided
    const updateFields = {};
    
    if (req.body.name !== undefined) {
      updateFields.name = req.body.name;
    }
    
    if (req.body.bankAccounts !== undefined) {
      // Validate bank accounts array if provided
      if (!Array.isArray(req.body.bankAccounts)) {
        return res.status(400).json({ 
          message: "bankAccounts must be an array" 
        });
      }
      
      // Validate each bank account has required fields
      for (const account of req.body.bankAccounts) {
        if (!account.accountTitle || !account.accountNo) {
          return res.status(400).json({ 
            message: "Each bank account must have accountTitle and accountNo" 
          });
        }
      }
      
      updateFields.bankAccounts = req.body.bankAccounts;
    }

    // Check if at least one field is being updated
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ 
        message: "At least one field (name or bankAccounts) must be provided" 
      });
    }


    const branch = await Branch.findOneAndUpdate(
      { _id: branchId, userId: userId },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.json(branch);
    
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to update branch", 
      error: error.message 
    });
  }
};

export const deleteBranch = async (req, res) => {
  const deleted = await Branch.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id
  })
  if (!deleted) return res.sendStatus(404)
  res.sendStatus(204)
}

export const getBranches = async (req, res) => {
  try {
    const userId = req.userId; // assuming middleware sets this
    const branches = await Branch.find({ userId }).sort({ name: 1 }); // optional sort
    
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch branches" });
  }
};
