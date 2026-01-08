# Quick Add & PubChem - User Guide

## 🎯 Quick Add Features

### Location: Left Sidebar Panel (New Section: "⚡ Quick Add")

---

## Quick Elements (6 Buttons)

**What They Do**: Instantly add single atoms at the canvas center

**Available Elements**:
- **C** - Carbon (Black)
- **N** - Nitrogen (Blue)  
- **O** - Oxygen (Red)
- **S** - Sulfur (Yellow)
- **P** - Phosphorus (Orange)
- **Cl** - Chlorine (Green)

**How to Use**:
1. Click element button (e.g., "N")
2. Nitrogen atom appears at center of canvas
3. Notification confirms: "Added N"
4. Repeat to add more atoms
5. Use regular bond tool to connect

**Best For**: Building molecules atom-by-atom quickly

---

## Quick Groups (6 Buttons)

**What They Do**: Insert common functional groups instantly

**Available Groups**:

| Group | Formula | Use Case |
|-------|---------|----------|
| **C=O** | Carbonyl | Aldehydes, Ketones |
| **OH** | Hydroxyl | Alcohols, Phenols |
| **NH2** | Amine | Organic amines, Proteins |
| **COOH** | Carboxyl | Carboxylic acids, Amino acids |
| **CHO** | Aldehyde | Quick aldehyde insertion |
| **COOR** | Ester | Esters, Carbohydrates |

**How to Use**:
1. Click group button (e.g., "COOH")
2. Complete COOH group appears at center (C=O and O-H bonds included!)
3. Notification shows: "Added COOH (Carboxyl)"
4. Group is ready to connect to main structure
5. No need to draw individual atoms and bonds

**Pro Tips**:
- Groups are pre-bonded and properly oriented
- Saves 5-10 clicks per group
- Perfect for organic synthesis structures
- Use with ring structures for complex molecules

**Best For**: Building complex organic molecules quickly

---

## Quick Rings (4 Buttons)

**What They Do**: Insert complete ring systems instantly

**Available Rings**:

| Ring | Type | Atoms | Use Case |
|------|------|-------|----------|
| **Benzene** | Aromatic | 6C + double bonds | Aromatics, substituted benzenes |
| **Cyclohexane** | Saturated | 6C (single bonds) | Saturated rings, chairs |
| **Cyclopentane** | Saturated | 5C (single bonds) | Sugars, five-membered rings |
| **Pyrrole** | Aromatic | 5C + 1N | Heterocycles, indoles |

**How to Use**:
1. Click ring button (e.g., "Benzene")
2. 6-membered benzene ring appears at center
3. Double bonds already drawn in aromatic pattern
4. Notification shows: "Added Benzene"
5. Ready to attach substituents

**Example Workflow**:
```
1. Click "Benzene"
2. Click "COOH" 
3. Use bond tool to connect them
→ You've built benzoic acid in 2 clicks!
```

**Best For**: Aromatic compounds, common ring systems

---

## Quick Actions (2 Buttons)

### Duplicate Button
**What It Does**: Creates an exact copy of your entire structure, offset to the right

**Use Cases**:
- Compare similar molecules
- Build symmetric structures
- Test modifications
- Side-by-side analysis

**How to Use**:
1. Draw a structure on canvas
2. Click "Duplicate" button
3. Identical copy appears 100 pixels to the right
4. Modify copy as needed

**Example**: Draw aspirin, duplicate it, modify one copy to show mechanism

---

### Clear Button
**What It Does**: Wipes canvas completely (with confirmation)

**Use Cases**:
- Start new structure
- Restart after mistake
- Begin next problem

**How to Use**:
1. Click "Clear"
2. Confirmation dialog appears: "Clear current structure? This cannot be undone."
3. Click OK to clear
4. Canvas is empty, ready for new structure

**Note**: Cannot be undone! Make sure you save if needed first.

---

## 🔍 PubChem Import (New Section)

### Location: Left Sidebar Panel (New Section: "🔍 PubChem Import")

**What It Does**: Search 90+ million molecules from PubChem database and import them instantly!

---

## How to Search

**Step 1: Type Molecule Name**
```
Examples:
- "aspirin"
- "caffeine" 
- "ethanol"
- "glucose"
- "ibuprofen"
- "naphthalene"
```

**Step 2: Click 🔍 Button or Press Enter**
- Loading indicator shows: "⏳"
- Search processes in real-time

**Step 3: Results Display**
- Shows up to 5 matching molecules
- Each result shows:
  - **Name** (bold, dark blue)
  - **Formula** (e.g., "C9H8O4")
  - **Weight** (e.g., "180.16")

**Example Results for "aspirin"**:
```
Aspirin
C9H8O4 | MW: 180.16    ← Click to import

2-Acetoxybenzoic acid
C9H8O4 | MW: 180.16    ← Alternative name

Acetylsalicylic acid
C9H8O4 | MW: 180.16    ← IUPAC name
```

---

## How to Import

**Option 1: Click on Result**
1. After searching, hover over a molecule
2. Row highlights with shadow effect
3. Click on the molecule row
4. Loading indicator shows: "⏳ Importing..."
5. Structure appears on canvas, centered automatically
6. Success notification shows: "✓ Imported: Aspirin\nC9H8O4"

**Option 2: Direct CID Search**
- If you know the PubChem CID (Compound ID)
- Type the number (e.g., "2244")
- Works just like name search

---

## Import Features

### Automatic Positioning
✓ Structure centers on canvas automatically
✓ No overlap with existing structures
✓ Node IDs auto-increment

### Information Display
✓ Compound name in notification
✓ Molecular formula in notification
✓ Molecular weight calculated
✓ 2D structure imported with correct bonds

### Error Handling
✓ Timeout protection (10 seconds)
✓ Friendly error messages
✓ Suggestions if exact match not found
✓ Network error handling

---

## Usage Examples

### Example 1: Compare Aspirin Variants
```
1. Click PubChem panel
2. Type "aspirin"
3. Click first result → Imported
4. Type "ibuprofen" 
5. Click result → Imported
→ Now you can analyze both structures!
```

### Example 2: Build Substituted Benzene
```
1. Click "Benzene" (Quick Ring)
2. Click "COOH" (Quick Group)
3. Bond them together
→ Benzoic acid done in 3 clicks!
```

### Example 3: Modify and Compare
```
1. Import "caffeine"
2. Click "Duplicate"
3. Edit the copy to remove a group
4. Compare both structures
→ Perfect for studying degradation!
```

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Search PubChem | Type + Enter |
| Quick Search | Focus input + Enter |
| Clear | Click button (with confirmation) |

---

## Tips & Tricks

### For Students
✓ Import textbook molecules to study
✓ Use Quick Add for homework problems
✓ Compare isomers side-by-side
✓ Check your drawn structures against database

### For Teachers
✓ Import examples for lectures
✓ Create comparison worksheets
✓ Build complex molecules as demonstrations
✓ Show real structures from PubChem

### Performance Tips
✓ Quick Add is instant (no network needed)
✓ PubChem search takes 0.5-2 seconds
✓ Importing adds to canvas within 1 second
✓ Works offline for Quick Add only
✓ Requires internet for PubChem features

---

## Troubleshooting

### "Molecule not found"
✓ Try different name (e.g., "acetylsalicylic acid" vs "aspirin")
✓ Try CID number if known
✓ Check spelling
✓ Try shorter name

### "Import failed"
✓ Check internet connection
✓ Wait a moment and try again
✓ Try different molecule
✓ Check browser console for errors

### Elements/Groups not appearing
✓ Refresh page (Ctrl+F5)
✓ Check if sidebar is visible
✓ Ensure canvas is not in select mode
✓ Try clicking in center of canvas

### Quick buttons not responding
✓ Wait 1 second between clicks
✓ Check if structure is selected (click empty area first)
✓ Make sure JavaScript is enabled
✓ Refresh page if stuck

---

## Advanced Use Cases

### 1. Reaction Mechanism Study
```
1. Import starting material
2. Duplicate structure
3. Import product
4. Use arrows to show transformation
```

### 2. Molecular Isomerism
```
1. Import "butane"
2. Duplicate twice more
3. Modify each to show different isomers
4. Label: n-butane, isobutane, cyclobutane
```

### 3. Organic Synthesis Pathway
```
1. Import starting material
2. Add products via Quick Add or Import
3. Draw arrows between structures
4. Show complete synthesis route
```

### 4. Pharmacology Study
```
1. Import drug molecules
2. Highlight functional groups with Quick Add
3. Compare similar drugs
4. Study structure-activity relationships
```

---

## Feature Limits

⚠️ **Quick Add**: 
- 10 elements only
- 10 functional groups
- 7 ring types
- All pre-designed, can't customize

✅ **PubChem Import**:
- 90+ million compounds
- Full database access
- Real 2D structures
- Complete molecule data

---

## Future Enhancements

Planned features:
- [ ] Favorites/History for quick access
- [ ] Custom functional group templates
- [ ] Batch import (multiple molecules)
- [ ] Advanced molecular search filters
- [ ] SMILES string import
- [ ] Direct structure drawing recognition
- [ ] Reaction suggestions
- [ ] Molecular property analysis

---

## Support & Questions

For issues or suggestions:
1. Check this guide
2. Try troubleshooting section
3. Refresh browser
4. Clear browser cache
5. Contact developer with error message

---

**Happy Chemistry Drawing! 🧪✨**

*Last Updated: January 8, 2026*
