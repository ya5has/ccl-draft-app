// Update the fetch path to point to the config in root
document.addEventListener('DOMContentLoaded', async function() {
  let config;
  let draftState = {
    currentRound: 0,
    currentTeamIndex: 0,
    picks: [],
    remainingPlayers: [],
    draftOrder: []
  };
  
  // Load configuration from YAML
  try {
    const response = await fetch('/config.yaml');
    if (!response.ok) {
      throw new Error(`Failed to load config.yaml (${response.status} ${response.statusText})`);
    }
    const yamlText = await response.text();
    config = jsyaml.load(yamlText);
    initializeDraft();
  } catch (error) {
    console.error('Error loading configuration:', error);
    document.body.innerHTML = `
      <div style="text-align:center; margin-top:50px; color:red;">
        <h2>Error loading draft configuration</h2>
        <p>${error.message}</p>
      </div>`;
  }
  
  function initializeDraft() {
    document.title = config.application.title;

    // Apply logo if specified
    if (config.application.logo) {
      const logoImg = document.querySelector('.logo');
      if (logoImg) {
        logoImg.src = '/' + config.application.logo;
        console.log("Applied logo:", config.application.logo);
      } else {
        console.warn("Logo element not found.");
      }
    }

    // Apply background image ONLY to the draft table (#teamsContainer)
    if (config.application.background_image) {
      const draftTable = document.getElementById('teamsContainer');
      const bgImageUrl = `/${config.application.background_image}`;

      if (draftTable) {
        console.log("Attempting to apply background to #teamsContainer:", bgImageUrl);

        // Inject CSS rules for the background pseudo-element
        const styleId = 'draft-table-background-style';
        let styleElement = document.getElementById(styleId);
        if (!styleElement) {
          styleElement = document.createElement('style');
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }

        styleElement.textContent = `
          #teamsContainer {
            position: relative; /* Needed for absolute positioning of ::before */
            z-index: 0; /* Establish stacking context */
          }

          #teamsContainer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: url('${bgImageUrl}');
            background-size: contain; /* Fit image within the container */
            background-position: center;
            background-repeat: no-repeat;
            opacity: 0.03; /* Reduced opacity further */
            z-index: -1; /* Place it behind the content */
            pointer-events: none; /* Make it non-interactive */
          }

          /* Ensure table content is above the background */
          #teamsContainer > * {
             position: relative;
             z-index: 1;
          }
        `;
        console.log("Applied background styles for #teamsContainer.");

        // Verify image loading (optional debug)
        const img = new Image();
        img.onload = () => console.log("Background image loaded successfully:", bgImageUrl);
        img.onerror = () => console.error("Failed to load background image:", bgImageUrl);
        img.src = bgImageUrl;

      } else {
        console.error("#teamsContainer element not found. Cannot apply background.");
      }
    } else {
      console.log("No background_image specified in config.");
    }
    
    // Calculate number of rounds based on player count and team count
    const numTeams = config.teams.length;
    const numPlayers = config.players.length;
    const calculatedRounds = Math.ceil(numPlayers / numTeams);
    
    // Use the calculated rounds or the config rounds, whichever is smaller
    const rounds = Math.min(calculatedRounds, config.draft.rounds || calculatedRounds);
    
    // Initialize draft state
    draftState.currentRound = 0;
    draftState.currentTeamIndex = 0;
    draftState.picks = [];
    draftState.remainingPlayers = [...config.players];
    
    // Create the draft order
    createDraftOrder(rounds);
    
    // Create round labels
    const roundsColumn = document.querySelector('.rounds-column');
    roundsColumn.innerHTML = `
      <div class="round-label">Teams</div>
      <div class="round-label">Captain</div>
    `;
    
    for (let i = 1; i <= rounds; i++) {
      const roundLabel = document.createElement('div');
      roundLabel.className = 'round-label';
      roundLabel.textContent = `Round ${i}`;
      roundsColumn.appendChild(roundLabel);
    }
    
    // Create team columns
    const teamsContainer = document.getElementById('teamsContainer');
    teamsContainer.innerHTML = '';
    
    // Sort teams by pick order
    const sortedTeams = [...config.teams]
      .map((team, index) => ({ team, index }))
      .sort((a, b) => (a.team.pick || Number.MAX_VALUE) - (b.team.pick || Number.MAX_VALUE));
    
    sortedTeams.forEach(({ team, index }) => {
      const teamColumn = document.createElement('div');
      teamColumn.className = 'team-column';
      teamColumn.dataset.team = index;
      
      // Team header with name
      const teamHeader = document.createElement('div');
      teamHeader.className = 'team-header';
      
      const teamName = document.createElement('div');
      teamName.className = 'team-name';
      teamName.textContent = team.name;
      teamName.style.color = team.color;
      
      teamHeader.appendChild(teamName);
      teamColumn.appendChild(teamHeader);
      
      // Captain cell
      const captainCell = document.createElement('div');
      captainCell.className = 'captain-cell';
      captainCell.textContent = team.captain;
      captainCell.style.color = team.color;
      teamColumn.appendChild(captainCell);
      
      // Empty cells for future picks
      for (let i = 1; i <= rounds; i++) {
        const cell = document.createElement('div');
        cell.className = 'player-cell';
        cell.dataset.round = i;
        cell.dataset.team = index;
        teamColumn.appendChild(cell);
      }
      
      teamsContainer.appendChild(teamColumn);
    });
    
    // Create player pool
    renderPlayerPool();
    
    // Highlight the next pick
    highlightNextPick();
    
    // Set up event listeners
    document.getElementById('undoButton').addEventListener('click', undoLastPick);
    document.getElementById('resetButton').addEventListener('click', confirmResetDraft);
    
    // Add snapshot button
    addSnapshotButton();
  }
  
  function createDraftOrder(rounds) {
    draftState.draftOrder = [];
    const numTeams = config.teams.length;
    
    // Sort teams by pick order
    const sortedTeamIndices = config.teams
      .map((team, index) => ({ team, index }))
      .sort((a, b) => (a.team.pick || Number.MAX_VALUE) - (b.team.pick || Number.MAX_VALUE))
      .map(item => item.index);
      
    // First round: use the pick order (left to right)
    let round1 = [...sortedTeamIndices];
    draftState.draftOrder.push(round1);
    
    // For all subsequent rounds:
    // - Always go right to left
    // - Start with the last team from round 1, then second-to-last, etc.
    
    // Round 2: Reverse of round 1 (right to left, starting with last team)
    let round2 = [...round1].reverse();
    draftState.draftOrder.push(round2);
    
    // For rounds 3+, shift the starting position by 1 each time
    // but always go right to left
    for (let round = 3; round <= rounds; round++) {
      // Calculate which team starts this round
      // For round 3, it's the second-to-last team from round 1
      // For round 4, it's the third-to-last team from round 1, etc.
      const startingTeamIndex = numTeams - (round - 1);
      
      // If we've cycled through all teams, wrap around
      const adjustedStartingIndex = (startingTeamIndex >= 0) ? 
        startingTeamIndex : (startingTeamIndex % numTeams + numTeams) % numTeams;
      
      // Create the order for this round
      let roundOrder = [];
      
      // Start with the calculated team
      roundOrder.push(round1[adjustedStartingIndex]);
      
      // Then add the rest of the teams in right-to-left order
      for (let i = 1; i < numTeams; i++) {
        const nextTeamIndex = (adjustedStartingIndex - i + numTeams) % numTeams;
        roundOrder.push(round1[nextTeamIndex]);
      }
      
      draftState.draftOrder.push(roundOrder);
    }
  }
  
  function renderPlayerPool() {
    const playerPool = document.getElementById('playerPool');
    playerPool.innerHTML = '';
    
    draftState.remainingPlayers.sort().forEach(player => {
      const playerItem = document.createElement('div');
      playerItem.className = 'player-pool-item';
      playerItem.textContent = player;
      playerItem.addEventListener('click', () => selectPlayer(player));
      playerPool.appendChild(playerItem);
    });
  }
  
  function highlightNextPick() {
    // Remove highlight from all team columns and rounds
    document.querySelectorAll('.team-column').forEach(col => {
      col.classList.remove('active');
    });
    
    document.querySelectorAll('.round-label').forEach(label => {
      label.classList.remove('round-highlight');
    });
    
    // Remove all pick numbers
    document.querySelectorAll('.team-pick-number').forEach(num => {
      num.remove();
    });
    
    // If draft is complete, don't highlight anything
    if (draftState.currentRound >= config.draft.rounds || draftState.remainingPlayers.length === 0) {
      document.querySelector('.ticker-content').textContent = 'Draft Complete! All players have been selected.';
      document.body.classList.add('draft-complete');
      return;
    }
    
    // Get the current round and team
    const currentRoundIndex = draftState.currentRound;
    const currentTeamIndex = draftState.draftOrder[currentRoundIndex][draftState.currentTeamIndex];
    
    // Highlight the current team column
    const teamColumn = document.querySelector(`.team-column[data-team="${currentTeamIndex}"]`);
    teamColumn.classList.add('active');
    
    // Highlight the current round
    // +2 because: +1 for "Teams" header, +1 for "Captain" row
    const roundLabels = document.querySelectorAll('.round-label');
    roundLabels[currentRoundIndex + 2].classList.add('round-highlight');
    
    // Add pick number indicator
    const teamHeader = teamColumn.querySelector('.team-header');
    const pickNumber = document.createElement('div');
    pickNumber.className = 'team-pick-number';
    pickNumber.textContent = draftState.currentTeamIndex + 1;
    teamHeader.appendChild(pickNumber);
    
    // Update ticker message
    const team = config.teams[currentTeamIndex];
    document.querySelector('.ticker-content').textContent = 
      `Round ${currentRoundIndex + 1}: ${team.name} is now picking (Pick ${draftState.currentTeamIndex + 1})`;
  }
  
  function selectPlayer(playerName) {
    if (draftState.currentRound >= config.draft.rounds) return;
    
    // Get the current round and team
    const currentRoundIndex = draftState.currentRound;
    const currentTeamIndex = draftState.draftOrder[currentRoundIndex][draftState.currentTeamIndex];
    
    // Record this pick
    draftState.picks.push({
      player: playerName,
      round: currentRoundIndex + 1,
      team: currentTeamIndex
    });
    
    // Remove player from pool
    draftState.remainingPlayers = draftState.remainingPlayers.filter(p => p !== playerName);
    
    // Update the UI
    updateTeamRoster(playerName, currentRoundIndex + 1, currentTeamIndex);
    
    // Move to next pick
    draftState.currentTeamIndex++;
    if (draftState.currentTeamIndex >= config.teams.length) {
      draftState.currentRound++;
      draftState.currentTeamIndex = 0;
    }
    
    // Render the updated player pool
    renderPlayerPool();
    
    // Highlight the next pick
    setTimeout(highlightNextPick, 100);
  }
  
  function updateTeamRoster(playerName, round, teamIndex) {
    const cell = document.querySelector(`.player-cell[data-round="${round}"][data-team="${teamIndex}"]`);
    cell.textContent = playerName;
    cell.style.color = config.teams[teamIndex].color;
  }
  
  function undoLastPick() {
    if (draftState.picks.length === 0) return;
    
    // Get the last pick
    const lastPick = draftState.picks.pop();
    
    // Add player back to pool
    draftState.remainingPlayers.push(lastPick.player);
    
    // Clear the team cell
    const cell = document.querySelector(`.player-cell[data-round="${lastPick.round}"][data-team="${lastPick.team}"]`);
    cell.textContent = '';
    
    // Move draft state back
    if (draftState.currentTeamIndex === 0) {
      draftState.currentRound--;
      draftState.currentTeamIndex = config.teams.length - 1;
    } else {
      draftState.currentTeamIndex--;
    }
    
    // Update UI
    renderPlayerPool();
    highlightNextPick();
  }
  
  function confirmResetDraft() {
    if (confirm('Are you sure you want to reset the entire draft? This action cannot be undone.')) {
      resetDraft();
    }
  }
  
  function resetDraft() {
    // Clear all team cells except captains
    document.querySelectorAll('.player-cell').forEach(cell => {
      if (cell.dataset.round) {
        cell.textContent = '';
      }
    });
    
    // Reset draft state
    draftState.currentRound = 0;
    draftState.currentTeamIndex = 0;
    draftState.picks = [];
    draftState.remainingPlayers = [...config.players];
    
    // Update UI
    renderPlayerPool();
    highlightNextPick();
  }
  
  // More targeted fix for round label spacing issue
  function fixRoundLabelSpacing() {
    // Find all round label elements
    const roundLabels = document.querySelectorAll('.round-label');
    
    // Log the current text content for debugging
    console.log("Round labels before fix:", Array.from(roundLabels).map(el => el.textContent));
    
    // Update each label with correct format
    roundLabels.forEach(label => {
      // Check various possible formats and fix them
      
      // Case 1: "Roundd1" format (with duplicate 'd')
      if (label.textContent.match(/Round(d)(\d+)/i)) {
        const fixedText = label.textContent.replace(/Round(d)(\d+)/i, 'Round $2');
        label.textContent = fixedText;
        console.log(`Fixed label from "${label.textContent}" to "${fixedText}"`);
      } 
      // Case 2: "Round1" format (no space)
      else if (label.textContent.match(/Round(\d+)/i)) {
        const fixedText = label.textContent.replace(/Round(\d+)/i, 'Round $1');
        label.textContent = fixedText;
        console.log(`Fixed label from "${label.textContent}" to "${fixedText}"`);
      }
      // Case 3: Malformed with extra spaces "Round  1"
      else if (label.textContent.match(/Round\s+(\d+)/i)) {
        const fixedText = label.textContent.replace(/Round\s+(\d+)/i, 'Round $1');
        label.textContent = fixedText;
        console.log(`Fixed label from "${label.textContent}" to "${fixedText}"`);
      }
    });
    
    console.log("Round labels after fix:", Array.from(roundLabels).map(el => el.textContent));
  }
  
  // Completely reimplemented snapshot functionality with index-based label regeneration
  function takeSnapshot() {
    console.log("Starting snapshot process...");

    if (typeof html2canvas === 'undefined') {
      alert('Error: html2canvas library not loaded.');
      return;
    }

    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '10px 20px';
    toast.style.background = 'rgba(0, 0, 0, 0.8)';
    toast.style.color = 'white';
    toast.style.borderRadius = '4px';
    toast.style.zIndex = '9999';
    toast.textContent = 'Creating snapshot...';
    document.body.appendChild(toast);

    const draftContainer = document.querySelector('.draft-container');
    if (!draftContainer) {
      console.error("Error: Could not find .draft-container element");
      toast.textContent = 'Error: Draft container not found';
      toast.style.background = 'rgba(220, 53, 69, 0.8)';
      setTimeout(() => toast.remove(), 3000);
      return;
    }

    // --- Snapshot Preparation ---
    const wrapper = document.createElement('div');
    wrapper.className = 'snapshot-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.background = getComputedStyle(document.body).backgroundColor;
    document.body.appendChild(wrapper);


    const clone = draftContainer.cloneNode(true);
    clone.style.display = 'flex';
    clone.style.width = draftContainer.offsetWidth + 'px';
    clone.style.height = draftContainer.offsetHeight + 'px';
    wrapper.appendChild(clone);

    // --- Aggressive Round Label Fix within Clone (INDEX-BASED) ---
    const roundLabels = clone.querySelectorAll('.rounds-column .round-label'); // More specific selector
    const originalLabels = draftContainer.querySelectorAll('.rounds-column .round-label');

    console.log(`Found ${roundLabels.length} round labels in clone's rounds-column to fix.`);

    roundLabels.forEach((label, index) => {
      const originalLabel = originalLabels[index];
      if (!originalLabel) return; // Safety check

      let correctText = "";

      // Determine correct text based on index
      if (index === 0) {
        correctText = "Teams";
      } else if (index === 1) {
        correctText = "Captain";
      } else {
        // Calculate round number (index 2 = Round 1, index 3 = Round 2, etc.)
        const roundNumber = index - 1;
        correctText = "Round " + roundNumber;
        // Check original label *only* for the '+' sign in case of Round 1+
        if (roundNumber === 1 && originalLabel.textContent.includes("+")) {
          correctText = "Round 1+";
        }
      }

      console.log(`Processing label ${index}: Original Text = "${originalLabel.textContent}", Regenerated Text = "${correctText}"`);

      // 1. Clear absolutely everything inside the label
      label.innerHTML = '';

      // 2. Force the REGENERATED text content
      label.textContent = correctText;

      // 3. Force computed styles from the original onto the clone's label
      const computedStyle = window.getComputedStyle(originalLabel);
      label.style.font = computedStyle.font;
      label.style.color = computedStyle.color;
      label.style.textAlign = computedStyle.textAlign;
      label.style.padding = computedStyle.padding;
      label.style.margin = computedStyle.margin;
      label.style.lineHeight = computedStyle.lineHeight;
      label.style.display = computedStyle.display;
      label.style.alignItems = computedStyle.alignItems;
      label.style.justifyContent = computedStyle.justifyContent;


      console.log(`Label ${index} reset. Set text to "${correctText}" and forced styles.`);

    });

    // --- Background Addition (remains the same) ---
    const teamsContainer = clone.querySelector('#teamsContainer');
    if (teamsContainer && window.config?.application?.background_image) {
      teamsContainer.style.position = 'relative';

      const bgDiv = document.createElement('div');
      bgDiv.className = 'teams-background';
      bgDiv.style.position = 'absolute';
      bgDiv.style.top = '0';
      bgDiv.style.left = '0';
      bgDiv.style.width = '100%';
      bgDiv.style.height = '100%';
      bgDiv.style.backgroundImage = `url('/${window.config.application.background_image}')`;
      bgDiv.style.backgroundSize = 'contain';
      bgDiv.style.backgroundPosition = 'center';
      bgDiv.style.backgroundRepeat = 'no-repeat';
      bgDiv.style.opacity = '0.03';
      bgDiv.style.zIndex = '0';
      bgDiv.style.pointerEvents = 'none';

      teamsContainer.insertBefore(bgDiv, teamsContainer.firstChild);

      Array.from(teamsContainer.children).forEach(child => {
        if (child !== bgDiv) {
          child.style.position = 'relative';
          child.style.zIndex = '1';
        }
      });
    }

    // --- Capture with html2canvas ---
    console.log("Forcing reflow by reading offsetHeight:", clone.offsetHeight);

    setTimeout(() => {
      console.log("Calling html2canvas...");
      html2canvas(clone, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: true,
        onclone: (clonedDoc) => {
           const finalLabels = clonedDoc.querySelectorAll('.rounds-column .round-label');
           console.log("Labels in onclone:", Array.from(finalLabels).map(l => l.textContent));
        }
      }).then(canvas => {
        console.log("html2canvas success.");
        const dataURL = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        link.download = `ccl-draft-${timestamp}.png`;
        link.href = dataURL;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        wrapper.remove();
        toast.textContent = 'Snapshot downloaded!';

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 2000);

      }).catch(error => {
        console.error("Error creating snapshot:", error);
        toast.textContent = 'Error: Could not create snapshot';
        toast.style.background = 'rgba(220, 53, 69, 0.8)';

        setTimeout(() => {
          toast.style.opacity = '0';
          setTimeout(() => toast.remove(), 300);
        }, 3000);

        wrapper.remove();
      });
    }, 800); // Keep increased delay
  }
  
  // Update the snapshot button to use the new implementation
  function addSnapshotButton() {
    const controlsDiv = document.querySelector('.controls');
    if (controlsDiv) {
      let snapshotButton = document.getElementById('snapshotButton');
      if (!snapshotButton) {
        snapshotButton = document.createElement('button');
        snapshotButton.id = 'snapshotButton';
        snapshotButton.className = 'control-btn snapshot-btn';
        snapshotButton.textContent = 'Take Snapshot';
        snapshotButton.addEventListener('click', takeSnapshot);
        controlsDiv.appendChild(snapshotButton);
      } else {
        // Update existing button
        snapshotButton.removeEventListener('click', takeSnapshot);
        snapshotButton.addEventListener('click', takeSnapshot);
      }
    }
  }
}); 