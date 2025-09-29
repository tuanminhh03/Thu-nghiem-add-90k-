import { jest } from "@jest/globals";

const mockSessionFactory = () => ({
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
});

const mockMongoose = {
  startSession: jest.fn(),
  connection: {
    getClient: jest.fn(() => ({
      topology: { description: { type: "Standalone" } },
      s: { description: { type: "Standalone" } },
    })),
    client: {
      topology: {
        description: { type: "Standalone" },
        s: { description: { type: "Standalone" } },
      },
    },
  },
};

const mockOrder = {
  create: jest.fn(),
};

const mockAccount50k = {
  find: jest.fn(() => ({ lean: jest.fn() })),
};

const mockNetflixAccount = {
  findOne: jest.fn(),
};

const mockCustomer = {
  findById: jest.fn(),
};

const triggerNetflixAutomationMock = jest.fn();
const triggerNetflixPinUpdateMock = jest.fn();
const triggerNetflixProfileRenameMock = jest.fn();

jest.unstable_mockModule("mongoose", () => ({
  __esModule: true,
  default: mockMongoose,
}));

jest.unstable_mockModule("../models/Order.js", () => ({
  __esModule: true,
  default: mockOrder,
}));

jest.unstable_mockModule("../models/Account50k.js", () => ({
  __esModule: true,
  default: mockAccount50k,
}));

jest.unstable_mockModule("../models/NetflixAccount.js", () => ({
  __esModule: true,
  default: mockNetflixAccount,
}));

jest.unstable_mockModule("../models/Customer.js", () => ({
  __esModule: true,
  default: mockCustomer,
}));

jest.unstable_mockModule("../services/netflixAutomation.js", () => ({
  triggerNetflixAutomation: triggerNetflixAutomationMock,
  triggerNetflixPinUpdate: triggerNetflixPinUpdateMock,
  triggerNetflixProfileRename: triggerNetflixProfileRenameMock,
}));

const { localSavings, createOrder } = await import("../controllers/orderController.js");
const mongoose = (await import("mongoose")).default;
const Order = (await import("../models/Order.js")).default;
const NetflixAccount = (await import("../models/NetflixAccount.js")).default;
const Customer = (await import("../models/Customer.js")).default;

const createMockRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res;
};

describe("orderController", () => {
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    session = mockSessionFactory();
    mongoose.startSession.mockResolvedValue(session);
  });

  describe("localSavings", () => {
    it("returns 401 when user is not authenticated", async () => {
      const req = { body: { amount: 100 }, user: null };
      const res = createMockRes();

      await localSavings(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Chưa đăng nhập",
      });
    });

    it("creates a savings order and deducts balance", async () => {
      const userId = "user123";
      const req = {
        body: { amount: 100, duration: "1 tháng", plan: "Gói tiết kiệm" },
        user: { id: userId },
      };
      const res = createMockRes();
      const customer = {
        amount: 200,
        name: "",
        save: jest.fn().mockResolvedValue(),
      };
      const newOrder = { id: "order1", amount: 100 };

      Customer.findById.mockResolvedValue(customer);
      Order.create.mockResolvedValue(newOrder);

      await localSavings(req, res);

      expect(Customer.findById).toHaveBeenCalledWith(userId);
      expect(customer.amount).toBe(100);
      expect(customer.save).toHaveBeenCalledTimes(1);
      expect(Order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: userId,
          amount: 100,
          plan: "Gói tiết kiệm",
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          order: newOrder,
          balance: 100,
        })
      );
    });
  });

  describe("createOrder", () => {
    it("returns 401 when user is missing", async () => {
      const req = {
        body: { plan: "Gói cao cấp", duration: "1 tháng", amount: 100 },
        user: null,
      };
      const res = createMockRes();

      await createOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Chưa đăng nhập",
      });
      expect(session.endSession).toHaveBeenCalledTimes(1);
    });

    it("creates a premium order and triggers automation", async () => {
      const userId = "user456";
      const req = {
        body: {
          plan: "Gói cao cấp",
          duration: "1 tháng",
          amount: 150,
          profileName: "  Gia đình  ",
          pin: " 1234 ",
          isKids: true,
        },
        user: { id: userId },
      };
      const res = createMockRes();
      const customer = {
        _id: userId,
        amount: 300,
        phone: "0123456789",
        save: jest.fn().mockResolvedValue(),
      };
      const account = {
        email: "acc@example.com",
        password: "pass123",
        profiles: [
          {
            id: "profile1",
            status: "empty",
            name: "",
            pin: "",
          },
        ],
        save: jest.fn().mockResolvedValue(),
      };
      const newOrder = {
        _id: "orderXYZ",
        plan: "Gói cao cấp",
      };

      Customer.findById.mockResolvedValue(customer);
      NetflixAccount.findOne.mockResolvedValue(account);
      Order.create.mockResolvedValue([newOrder]);

      await createOrder(req, res);

      expect(Customer.findById).toHaveBeenCalledWith(userId);
      expect(NetflixAccount.findOne).toHaveBeenCalledWith({
        plan: "Gói cao cấp",
        "profiles.status": "empty",
      });
      expect(Order.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            user: userId,
            plan: "Gói cao cấp",
            amount: 150,
            profileName: "Gia đình",
            pin: "1234",
          }),
        ],
        {}
      );
      expect(customer.amount).toBe(150);
      expect(customer.save).toHaveBeenCalledWith({});
      expect(account.save).toHaveBeenCalledWith({});
      expect(triggerNetflixAutomationMock).toHaveBeenCalledWith({
        email: "acc@example.com",
        password: "pass123",
        profileName: "Gia đình",
        pin: "1234",
        isKids: true,
      });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          order: newOrder,
          balance: 150,
          netflixAccount: expect.objectContaining({
            email: "acc@example.com",
            profileName: "Gia đình",
          }),
        })
      );
    });
  });
});
