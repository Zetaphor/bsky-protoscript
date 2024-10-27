# ProtoScript

ProtoScript is a platform that lets you publish Javascript code to your ATProto Personal Data Server (PDS). You can then view and execute the code from any user account directly in your browser.

### Installation

1. Clone the repository:   ```
   git clone https://github.com/yourusername/protoscript.git   ```

2. Navigate to the project directory:   ```
   cd protoscript   ```

3. Run the script with Deno:   ```
   deno start run.ts   ```

## Security Considerations

- App passwords are used for authentication, make sure your app password is not present in the input before executing someone else's code.
- This project is intended for educational and experimental purposes. Use it at your own risk.