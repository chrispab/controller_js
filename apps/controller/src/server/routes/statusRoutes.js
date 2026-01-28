import express from 'express';
import { stateManager } from '../../controlLoop.js';
import { getPackageInfo } from '../../utils/utils.js';

const router = express.Router();

//get the zoneName from the state manager
router.get('/zoneName', (req, res) => {
  res.json({ message: stateManager.getState().zoneName });
});

//get the version from the state manager
router.get('/status', (req, res) => {
  const currentState = stateManager.getState();
  res.json({ message: currentState });
});

router.get('/soilMoisturePercent', (req, res) => {
  res.json({ message: stateManager.getState().soilMoisturePercent });
});

router.get(
  '/mqtt/soil1/sensor_method5_batch_moving_average_float',
  (req, res) => {
    res.json({ message: stateManager.getState().SensorSoilMoistureRaw });
  },
);

router.get('/mqtt/irrigationPump/status', (req, res) => {
  res.json({ message: stateManager.getState().irrigationPump });
});

router.get('/outside-temperature', (req, res) => {
  res.json({ message: stateManager.getState().outsideTemperature });
});

router.get('/packageInfo', (req, res) => {
  res.json({ message: getPackageInfo() });
} );

// router.get('/version', (req, res) => {
//   res.json({ message: getPackageInfo().version });
// });

// router.get('/release-notes', (req, res) => {
//   res.json({ message: getPackageInfo().releaseNotes });
// });

// router.get('/description', (req, res) => {
//   res.json({ message: getPackageInfo().description });
// }); 

export default router;
