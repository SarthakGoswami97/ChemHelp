# Chemistry Reactions Implementation Plan

## Overview
A comprehensive system for users to perform chemical reactions on compounds they draw in the ChemHelp application. Users will be able to select reaction types and see the products.

---

## Phase 1: Core Architecture

### 1.1 Reaction Data Structure
```javascript
{
  id: "reaction_001",
  name: "Hydrogenation",
  category: "Addition",
  description: "Addition of hydrogen across double/triple bonds",
  reactantPattern: [
    {
      minC: 0, maxC: 100,
      minH: 0, maxH: 100,
      requireBond: "double|triple", // C=C or C≡C
      catalysts: ["Ni", "Pd", "Pt"]
    }
  ],
  productFormula: (reactant) => { /* transform logic */ },
  conditions: {
    temperature: "25°C - 100°C",
    pressure: "1-100 atm",
    catalyst: "Nickel, Palladium, or Platinum"
  }
}
```

### 1.2 Database Structure
- **reactions.json**: Library of 50-100 common reactions
- **reaction_rules.json**: Defines reactant patterns and transformation rules
- **user_reactions.json**: Tracks user-performed reactions in their session

---

## Phase 2: Backend Implementation

### 2.1 API Endpoints

#### GET /api/reactions
- Returns all available reactions
- Filters: category, difficulty, name

#### GET /api/reactions/:reactionId
- Returns detailed reaction info

#### POST /api/reactions/validate
- Validates if a drawn structure matches reaction requirements
- Input: nodes, bonds
- Output: { isValid: boolean, matchedReactions: [] }

#### POST /api/reactions/predict
- Predicts reaction products
- Input: nodes, bonds, selectedReaction
- Output: { productNodes, productBonds, mechanism }

#### POST /api/reactions/history
- Saves performed reaction to user profile
- Input: originalStructure, reaction, product

### 2.2 Reaction Categories (Priority Order)

**Level 1 - Common/Basic (Weeks 1-2)**
1. **Oxidation** (C → C-O, CxH → CxO)
2. **Reduction** (C=C → C-C, C=O → CHOH)
3. **Hydrogenation** (C=C + H2 → C-C)
4. **Dehydration** (C-OH → C=C + H2O)
5. **Esterification** (COOH + ROH → COOR + H2O)

**Level 2 - Intermediate (Weeks 3-4)**
6. **Combustion** (CxHy + O2 → CO2 + H2O)
7. **Substitution** (C-X + Y → C-Y + X)
8. **Addition** (C=C + XY → C-C with X,Y)
9. **Polymerization** (nCH2=CH2 → [CH2-CH2]n)
10. **Hydration** (C=C + H2O → CHOH-CH2)

**Level 3 - Advanced (Weeks 5-6)**
11. **Friedel-Crafts Alkylation**
12. **Grignard Reaction**
13. **Aldol Condensation**
14. **Diels-Alder**
15. **Fischer Esterification**

---

## Phase 3: Frontend Implementation

### 3.1 UI Components

#### Reaction Panel
```html
<div id="reactionPanel">
  <select id="reactionCategory">
    <option>All Reactions</option>
    <option>Addition</option>
    <option>Oxidation</option>
    <option>Substitution</option>
    ...
  </select>
  
  <div id="reactionsList">
    <!-- Dynamic reaction list -->
  </div>
  
  <div id="reactionInfo">
    <!-- Shows selected reaction details -->
  </div>
</div>
```

#### Reaction Steps Display
```html
<div id="reactionModal">
  <h2>Reaction Mechanism</h2>
  <div id="stepByStep">
    <!-- Step 1: Reactant -->
    <!-- Step 2: Transition State -->
    <!-- Step 3: Product -->
  </div>
  <button id="applyReactionBtn">Apply Reaction</button>
</div>
```

### 3.2 Workflow
1. User draws a molecule
2. User clicks "Reactions" button in sidebar
3. App scans drawn structure against reaction patterns
4. Shows matching reactions in a list
5. User selects reaction
6. Shows reaction mechanism and conditions
7. Click "Apply" to generate product
8. Product appears on canvas, original saved in history

### 3.3 Features
- **Real-time Validation**: Show which reactions are applicable as user draws
- **Step-by-Step Visualization**: Animate reaction mechanism (Reactant → Transition State → Product)
- **Reaction History**: Track all reactions performed in session
- **Save Reaction Products**: Save products to profile
- **Undo/Redo**: Revert reactions

---

## Phase 4: Data Preparation

### 4.1 Sample Reaction Rules

**Hydrogenation Example**
```javascript
{
  id: "hydrogenation",
  name: "Hydrogenation",
  description: "Addition of H2 across C=C or C≡C",
  pattern: {
    hasBond: (bonds, nodes) => {
      return bonds.some(b => (b.order === 2 || b.order === 3) && 
        nodes[b.aId]?.label === 'C' && nodes[b.bId]?.label === 'C')
    }
  },
  transform: (nodes, bonds) => {
    // Find C=C bonds and convert to C-C with H additions
  }
}
```

**Oxidation Example**
```javascript
{
  id: "oxidation_primary_alcohol",
  name: "Oxidation of Primary Alcohol",
  description: "R-CH2OH → R-CHO (aldehyde)",
  pattern: {
    hasAlcohol: (nodes, bonds) => {
      // Detect -CH2OH pattern
    }
  },
  conditions: ["H2CrO4", "PCC", "DMP"],
  transform: (nodes, bonds) => {
    // Convert CH2OH to CHO
  }
}
```

### 4.2 Mechanism Animations
- Frame 1: Original structure (Reactant)
- Frame 2: Add reagent/catalyst notation
- Frame 3: Transition state (curved arrows showing electron movement)
- Frame 4: Final product

---

## Phase 5: Advanced Features (Future)

### 5.1 Reaction Conditions
- Temperature control
- Solvent selection
- Catalyst types
- Pressure (if applicable)

### 5.2 Yield Prediction
- Estimate reaction yield percentage
- Show side products
- Display byproducts

### 5.3 Mechanism Explanation
- Show electron movement with curved arrows
- Display intermediate structures
- Explain stereochemistry changes

### 5.4 Synthesis Planning
- Multi-step synthesis routes
- Retrosynthesis (working backwards from target)
- Calculate reaction sequences

### 5.5 Safety & Hazards
- Display hazard warnings per reaction
- Show required PPE
- Temperature/pressure warnings

---

## Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| Planning & Setup | 2 days | Finalize reaction database, set up API routes |
| Backend Core | 1 week | Implement reaction validation and prediction |
| Level 1 Reactions | 2 weeks | Code 5 basic reactions with tests |
| Frontend UI | 1 week | Build reaction panel and modal UI |
| Animation Engine | 1 week | Create step-by-step mechanism display |
| Level 2 Reactions | 2 weeks | Add 5 intermediate reactions |
| Testing & Polish | 1 week | Bug fixes, performance optimization |
| Level 3 Reactions | 2 weeks | Advanced reactions (optional) |
| **Total** | **~11 weeks** | Full implementation |

---

## Technical Stack

- **Frontend**: Vanilla JavaScript with Canvas API for animations
- **Backend**: Node.js/Express for reaction logic
- **Database**: JSON files for reactions (can upgrade to MongoDB)
- **Animation**: Canvas drawing + requestAnimationFrame for smooth transitions
- **Validation**: Pattern matching algorithm for reactant detection

---

## File Structure to Create

```
/reactions
  ├── reactions.json          # Reaction database
  ├── reaction-rules.json     # Pattern matching rules
  └── reaction-mechanics.json # Animation data

/api
  ├── reactions.js            # Reaction endpoints
  └── reaction-validator.js   # Pattern matching logic

/ui
  ├── reactions-panel.html    # Reaction selector UI
  ├── reactions.css           # Styling
  └── reactions.js            # Frontend logic

/animation
  ├── reaction-animator.js    # Step-by-step animations
```

---

## Key Algorithms Needed

### 1. Molecular Pattern Matching
- Detect functional groups (OH, COOH, C=C, aromatic rings)
- Match reaction requirements
- Validate reactant compatibility

### 2. Product Prediction
- Transform nodes (change labels, positions)
- Transform bonds (change orders, add/remove bonds)
- Add new atoms (H, O, etc.)

### 3. Stereochemistry Handling
- Track wedge/dashed bonds
- Predict stereochemical outcomes
- Show R/S configurations (advanced)

---

## Testing Strategy

1. **Unit Tests**: Test each reaction rule independently
2. **Integration Tests**: Test full reaction pipeline
3. **Visual Tests**: Verify animations render correctly
4. **User Tests**: Get feedback on UI/UX

---

## Success Metrics

- ✅ 15+ reactions implemented and working
- ✅ <500ms validation time for pattern matching
- ✅ Smooth animations with 60fps
- ✅ 95%+ accuracy in product prediction
- ✅ Users can perform multi-step syntheses
- ✅ Mobile-responsive reaction UI

---

## Notes

- Start with simple reactions (hydrogenation, oxidation)
- Build modular so reactions can be added easily
- Consider using SMILES notation for compound representation (future)
- Could integrate with RDKit Python library for advanced chemistry (future)
