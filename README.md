## Sequra 23.1.0 Cartridge

1. To install the cartridge please check the integration documentation in: ./documentation/SFRA Sequra Integration-Documentation-23.1.0

2. To upload the cartridges:

   Run npm install to install all of the local dependencies

   Run npm run compile:js from the command line that would compile all client-side JS files. Run npm run compile:scss that would do the same for css.

   Create dw.json file in the root of the project:

   {
   "hostname": "your-sandbox-hostname.demandware.net",
   "username": "yourlogin",
   "password": "yourpwd",
   "code-version": "version_to_upload_to"
   }
   Run npm run uploadCartridge. It will upload int_sequra_sfra cartridge to the sandbox you specified in dw.json file.

3)Testing
Running unit tests
You can Run npm run unitTest to execute all unit tests in the project.

    Running integration tests
    	Integration tests are located in the ./test/integration directory.
    	To run integration tests you can use the following command: npm run integration-test
