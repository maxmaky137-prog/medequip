import { Asset, AssetStatus, CheckRecord, MaintenanceRecord, LoanRecord, MaintenanceType } from '../types';

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'EQ-001',
    name: 'Vital Sign Monitor',
    brand: 'Philips',
    model: 'IntelliVue MX450',
    serialNumber: 'PH-VSM-2023-001',
    department: 'ER',
    purchaseDate: '2023-01-15',
    price: 150000,
    status: AssetStatus.ACTIVE,
    nextPmDate: '2024-06-15',
    image: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: 'EQ-002',
    name: 'Defibrillator',
    brand: 'Zoll',
    model: 'R Series',
    serialNumber: 'ZL-DEF-2022-889',
    department: 'ICU',
    purchaseDate: '2022-11-20',
    price: 350000,
    status: AssetStatus.MAINTENANCE_DUE,
    nextPmDate: '2024-05-20',
    image: 'https://picsum.photos/200/200?random=2'
  },
  {
    id: 'EQ-003',
    name: 'Infusion Pump',
    brand: 'B. Braun',
    model: 'Infusomat Space',
    serialNumber: 'BB-INF-9921',
    department: 'Pediatrics',
    purchaseDate: '2023-03-10',
    price: 45000,
    status: AssetStatus.LOANED,
    nextPmDate: '2024-09-10',
    image: 'https://picsum.photos/200/200?random=3'
  },
  {
    id: 'EQ-004',
    name: 'Portable X-Ray',
    brand: 'Fujifilm',
    model: 'FDR Go',
    serialNumber: 'FJ-XRAY-7721',
    department: 'Radiology',
    purchaseDate: '2021-06-01',
    price: 1200000,
    status: AssetStatus.REPAIR,
    nextPmDate: '2024-06-01',
    image: 'https://picsum.photos/200/200?random=4'
  },
  {
    id: 'EQ-005',
    name: 'ECG Machine',
    brand: 'GE Healthcare',
    model: 'MAC 2000',
    serialNumber: 'GE-ECG-1102',
    department: 'OPD',
    purchaseDate: '2023-08-15',
    price: 85000,
    status: AssetStatus.ACTIVE,
    nextPmDate: '2024-08-15',
    image: 'https://picsum.photos/200/200?random=5'
  }
];

export const MOCK_CHECKS: CheckRecord[] = [
  { id: 'CHK-001', assetId: 'EQ-001', assetName: 'Vital Sign Monitor', date: '2024-05-25', checkerName: 'Nurse Joy', type: 'Daily', status: 'Pass' },
  { id: 'CHK-002', assetId: 'EQ-002', assetName: 'Defibrillator', date: '2024-05-25', checkerName: 'Dr. House', type: 'Daily', status: 'Fail', notes: 'Battery indicator low' },
  { id: 'CHK-003', assetId: 'EQ-003', assetName: 'Infusion Pump', date: '2024-05-24', checkerName: 'Nurse Joy', type: 'Daily', status: 'Pass' },
];

export const MOCK_MAINTENANCE: MaintenanceRecord[] = [
  { 
    id: 'MT-001', 
    assetId: 'EQ-004', 
    assetName: 'Portable X-Ray', 
    type: MaintenanceType.CM, 
    requestDate: '2024-05-20', 
    technician: 'Eng. Somchai', 
    cost: 5000, 
    description: 'Arm movement stuck', 
    status: 'In Progress' 
  },
  { 
    id: 'MT-002', 
    assetId: 'EQ-002', 
    assetName: 'Defibrillator', 
    type: MaintenanceType.PM, 
    requestDate: '2024-05-21', 
    technician: 'Eng. Somchai', 
    cost: 2000, 
    description: 'Annual calibration', 
    status: 'Pending' 
  }
];

export const MOCK_LOANS: LoanRecord[] = [
  {
    id: 'LN-001',
    assetId: 'EQ-003',
    assetName: 'Infusion Pump',
    borrowerName: 'ICU Ward',
    department: 'ICU',
    loanDate: '2024-05-18',
    dueDate: '2024-05-25',
    status: 'Active'
  }
];