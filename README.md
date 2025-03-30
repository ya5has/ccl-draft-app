# Simple Draft Application

A web-based tool for conducting a fantasy-style serpentine draft. It displays teams, captains, picks per round, and a pool of available players, dynamically updating as the draft progresses.

## Features

*   Displays teams, captains, and draft picks in a grid format.
*   Manages a pool of available players.
*   Calculates the required number of rounds automatically.
*   Implements a standard serpentine draft order (with custom variations for later rounds).
*   Highlights the current team on the clock.
*   Updates the player pool count dynamically.
*   "Undo Last Pick" functionality.
*   "Reset Draft" functionality.
*   "Take Snapshot" button to download a PNG image of the current draft board.
*   Customizable title, logo, background image, teams, and players via `config.yaml`.

## Setup and Running

This application requires Node.js and npm (Node Package Manager) to be installed on your system.

1.  **Install Node.js:** If you don't have Node.js installed, download and install it from the official website: [https://nodejs.org/](https://nodejs.org/). Installing Node.js will also install npm. You can verify the installation by opening your terminal or command prompt and running `node -v` and `npm -v`.

2.  **Clone or Download the Code:** Get the project files (`index.html`, `styles.css`, `draft.js`, `config.yaml`, `server.js`, `package.json`, etc.) onto your local machine.

3.  **Navigate to the Project Directory:** Open your terminal or command prompt and change to the root directory of the project (the folder containing `package.json` and `server.js`).

4.  **Install Dependencies:** Run the following command to install the necessary Node.js packages (specifically Express, as defined in `package.json`):
    ```bash
    npm install
    ```

5.  **Run the Application:** Start the server using the npm script defined in `package.json`:
    ```bash
    npm start
    ```
    This command executes `node server.js`. You should see a message like `CCL Draft app listening at http://localhost:3000`.

6.  **Access the Application:** Open your web browser and navigate to `http://localhost:3000`.

## Configuration (`config.yaml`)

The `config.yaml` file is used to customize the draft settings, teams, and players.


**Customization Options:**

*   **`application`**:
    *   `title`: Sets the text displayed in the browser tab and the main `<h1>` header on the page. If omitted, the header will be blank and the tab title will default to "Draft".
    *   `logo`: (Optional) Specifies the path to an image file (e.g., PNG, JPG, SVG) to be displayed in the header. The path should be relative to the root directory where `index.html` resides (e.g., if the logo is in `public/images/logo.png`, use `public/images/logo.png`). If omitted or left blank, no logo will be shown.
    *   `background_image`: (Optional) Specifies the path to an image file to be used as a faint background for the draft grid area. Path relative to the root directory. If omitted, no background image will be applied.
*   **`teams`**: This is a list of team objects.
    *   `name`: The display name of the team.
    *   `captain`: The name of the team captain.
    *   `color`: (Optional) A valid CSS color string (e.g., `red`, `#00FF00`, `rgb(0,0,255)`) used to style the team's name and their drafted players in the grid.
    *   `pick`: **Required**. An integer representing the team's draft position in the *first round*. The application uses these numbers to sort the teams and establish the initial draft order (Round 1 goes from lowest pick number to highest).
*   **`players`**: This is a simple list of strings, where each string is the name of a player available to be drafted. The order in this list does not affect the draft order, but players will be sorted alphabetically in the "Player Pool" display. The total number of players and teams determines the number of rounds in the draft.

## Usage

1.  Start the server using `npm start`.
2.  Open the application in your browser at `http://localhost:3000`.
3.  The draft board will display teams based on their Round 1 pick order from `config.yaml`.
4.  The "Player Pool" on the right lists all available players.
5.  The application highlights the team currently scheduled to pick.
6.  Click on a player's name in the "Player Pool" to assign them to the currently highlighted team's next available slot.
7.  The player will be added to the team's roster, removed from the pool, and the highlight will move to the next team in the draft order.
8.  Use the "Undo Last Pick", "Reset Draft", and "Take Snapshot" buttons in the header as needed.