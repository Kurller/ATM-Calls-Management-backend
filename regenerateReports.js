import { generateReportsCron } from './src/controllers/reportController.js';

(async () => {
  try {
    await generateReportsCron();
    console.log('✅ Weekly report regenerated successfully');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();