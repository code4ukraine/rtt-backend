# dataprocessing

Script 1 (Create a csv of events that have been uploaded, but not reviewed)
  - Run npm install
  - Run "aws configure"
    - AWS Access Key ID: [Provided]
    - AWS Secret Access Key: [provided]
    - Region: "us-east-2"
    - Default output format [JSON] : *Enter*
  - Navigate to src directory and run "node getUnreviewedCsv" This will create a csv in the unreviewedData directory of the form "dataToReview[current Date].csv"

Script 2 (Upload reviewed CSV to the reviewed Table)
  - Run npm install
  - Run "aws configure"
    - AWS Access Key ID: [Provided]
    - AWS Secret Access Key: [provided]
    - Region: "us-east-2"
    - Default output format [JSON] : *Enter*
  - Make sure the csv you want is in reviewedScripts Folder
  - Run "node uploadReviewedCSV ./reviewedScripts/[name of csv].csv
  - Only items where the status is not blank will be uploaded (so if you upload partially reviewed data only reviewed events will be uploaded)
    - If you then run script 1 the output csv will not include any reviewed items uploaded above.
  
Script 3
  - RUn npm install
  - Run "aws configure"
    - AWS Access Key ID: [Provided]
    - AWS Secret Access Key: [provided]
    - Region: "us-east-2"
    - Default output format [JSON] : *Enter*
  - Get the path to the vendor upload CSV in your local directory
  - Run "node servingFinalReviewedData [path to file]"
  - This will put new data.json in finalData folder