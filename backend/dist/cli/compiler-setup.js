"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function runCommand(command) {
    console.log(`Running command: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    if (stderr) {
        console.warn(`Command output warning: ${stderr}`);
    }
    return stdout.trim();
}
async function main() {
    try {
        // Update the package list
        console.log("Updating package lists...");
        await runCommand('sudo apt-get update');
        // Install build-essential, git, and docbook-xsl for a2x
        console.log("Installing build-essential, git, and docbook-xsl...");
        await runCommand('sudo apt-get install -y build-essential git docbook-xsl asciidoc-base');
        // Verify build-essential installation (via gcc)
        if (await runCommand('command -v gcc')) {
            console.log("build-essential installed successfully.");
        }
        else {
            throw new Error("Failed to install build-essential. Exiting script.");
        }
        // Verify Git installation
        if (await runCommand('git --version')) {
            console.log("Git installed successfully.");
        }
        else {
            throw new Error("Failed to install Git. Exiting script.");
        }
        // Verify a2x is available after installing docbook-xsl
        if (await runCommand('command -v a2x')) {
            console.log("'a2x' tool installed successfully.");
        }
        else {
            throw new Error("Failed to install 'a2x'. Exiting script.");
        }
        // Install Clang
        console.log("Installing Clang...");
        await runCommand('sudo apt-get install -y clang');
        // Verify Clang installation
        if (await runCommand('command -v clang')) {
            console.log("Clang installed successfully.");
        }
        else {
            throw new Error("Failed to install Clang. Exiting script.");
        }
        // Add the necessary PPA for Lua 5.4 and update package lists
        console.log("Installing Lua 5.4...");
        await runCommand('sudo apt-get install -y lua5.4');
        // Verify Lua 5.4 installation
        if (await runCommand('command -v lua5.4')) {
            console.log("Lua 5.4 installed successfully.");
        }
        else {
            throw new Error("Failed to install Lua 5.4. Exiting script.");
        }
        // Install Python 3
        console.log("Installing Python 3...");
        await runCommand('sudo apt-get install -y python3');
        // Verify Python 3 installation
        if (await runCommand('command -v python3')) {
            console.log("Python 3 installed successfully.");
        }
        else {
            throw new Error("Failed to install Python 3. Exiting script.");
        }
        // Install Ruby
        console.log("Installing Ruby...");
        await runCommand('sudo apt-get install -y ruby-full');
        // Verify Ruby installation
        if (await runCommand('command -v ruby')) {
            console.log("Ruby installed successfully.");
        }
        else {
            throw new Error("Failed to install Ruby. Exiting script.");
        }
        // Clone ioi/isolate repository from GitHub
        const isolateRepoUrl = 'https://github.com/ioi/isolate.git';
        const cloneDir = './isolate'; // Change the directory as needed
        console.log(`Cloning ${isolateRepoUrl} into ${cloneDir}...`);
        await runCommand(`git clone ${isolateRepoUrl} ${cloneDir}`);
        // Verify ioi/isolate repository cloning
        if (await runCommand(`ls -l ${cloneDir}`)) {
            console.log("ioi/isolate cloned successfully.");
            // Navigate to the isolate directory and perform make install
            console.log("Running 'make' in the isolate directory...");
            await runCommand('cd ' + cloneDir + ' && make');
            console.log("Running 'sudo make install' in the isolate directory...");
            await runCommand('cd ' + cloneDir + ' && sudo make install');
            console.log("Cleaning up cloned ioi/isolate folder...");
            await runCommand(`rm -rf ${cloneDir}`);
        }
        else {
            throw new Error("Failed to clone ioi/isolate. Exiting script.");
        }
        console.log("All installations and setup completed successfully!");
    }
    catch (err) {
        if (err instanceof Error) {
            console.error("[Compiler-Setup]: " + err.message);
        }
        else {
            console.error("[Compiler-Setup]: An error occurred");
        }
        process.exit(1);
    }
}
main();
