import AppointmentModel from '../models/appointmentModel';
import UserModel from '../models/userModel';

const getTotalPatients = async (req, res) => {
  try {
    const totalPatients = await AppointmentModel.distinct("patientId");
    res.json({ totalPatients: totalPatients.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRepeatPatients = async (req, res) => {
  try {
    const repeatPatients = await AppointmentModel.aggregate([
      { $group: { _id: "$patientId", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    res.json({ repeatPatients: repeatPatients.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAppointmentChartData = async (req, res) => {
  try {
    const appointmentData = await AppointmentModel.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const yearWiseData = appointmentData.reduce((acc, cur) => {
      const yearIndex = acc.findIndex((item) => item.year === cur._id.year);
      const typeKey = cur._id.type === "online" ? "onlineConsultation" : "otherAppointment";

      if (yearIndex === -1) {
        acc.push({ year: cur._id.year, [typeKey]: cur.count });
      } else {
        acc[yearIndex][typeKey] = (acc[yearIndex][typeKey] || 0) + cur.count;
      }
      return acc;
    }, []);

    const monthWiseData = appointmentData.reduce((acc, cur) => {
      const monthKey = `${cur._id.year}-${cur._id.month}`;
      acc[monthKey] = acc[monthKey] || { onlineConsultation: 0, otherAppointment: 0 };
      acc[monthKey][cur._id.type === "online" ? "onlineConsultation" : "otherAppointment"] += cur.count;
      return acc;
    }, {});

    res.json({ yearWiseData, monthWiseData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPatientSummary = async (req, res) => {
  try {
    const summary = await AppointmentModel.aggregate([
      {
        $project: {
          dayOfWeek: { $dayOfWeek: "$date" },
          patientId: 1,
        },
      },
      {
        $group: {
          _id: "$dayOfWeek",
          newPatients: { $addToSet: "$patientId" },
          totalPatients: { $sum: 1 },
        },
      },
    ]);

    const weekData = Array(7).fill(0);
    summary.forEach(({ _id, totalPatients }) => {
      weekData[_id - 1] = totalPatients;
    });

    res.json({ week: { categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], data: weekData } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPatientDepartmentData = async (req, res) => {
  try {
    const departmentData = await AppointmentModel.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "doctorId",
          foreignField: "_id",
          as: "doctorData",
        },
      },
      { $unwind: "$doctorData" },
      {
        $group: {
          _id: "$doctorData.metaData.speciality",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(
      departmentData.map((item, index) => ({
        key: `${index + 1}`,
        name: item._id,
        count: item.count.toString(),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDoctorDepartmentData = async (req, res) => {
  try {
    const doctorData = await UserModel.aggregate([
      { $match: { role: "doctor" } },
      {
        $group: {
          _id: "$metaData.speciality",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json(
      doctorData.map((item, index) => ({
        key: `${index + 1}`,
        name: item._id,
        count: item.count.toString(),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getPatientAgeDistribution = async (req, res) => {
  try {
    const ageGroups = [
      { range: "0-2 Years", min: 0, max: 2 },
      { range: "3-12 Years", min: 3, max: 12 },
      { range: "13-19 Years", min: 13, max: 19 },
      { range: "20-39 Years", min: 20, max: 39 },
      { range: "40-59 Years", min: 40, max: 59 },
      { range: "60 And Above", min: 60, max: Infinity },
    ];

    const patientData = await UserModel.find({ role: "patient" }, "age");
    const distribution = ageGroups.map((group) => ({
      age: group.range,
      value: patientData.filter((p) => p.age >= group.min && p.age <= group.max).length,
    }));

    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const reportController = async (req, res) => {
  const { type } = req.query; // Identify which data needs to be fetched

  switch (type) {
    case "total-patients":
      await getTotalPatients(req, res);
      break;
    case "repeat-patients":
      await getRepeatPatients(req, res);
      break;
    case "appointment-chart":
      await getAppointmentChartData(req, res);
      break;
    case "patient-summary":
      await getPatientSummary(req, res);
      break;
    case "patient-department":
      await getPatientDepartmentData(req, res);
      break;
    case "doctor-department":
      await getDoctorDepartmentData(req, res);
      break;
    case "patient-age-distribution":
      await getPatientAgeDistribution(req, res);
      break;
    default:
      res.status(400).json({ error: "Invalid report type" });
  }
};

export default reportController;
