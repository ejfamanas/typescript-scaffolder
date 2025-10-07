import {
    generateFakerMockValue,
    generateStaticMockValue,
    getCodeGenFakerValueForKey,
    getRuntimeFakerValueForKey,
    getMockValueForProperty
} from "../../../src/utils/mocking/mock-value-resolver";
import { Logger } from "../../../src/utils/logger";

jest.mock("../../../src/utils/logger", () => ({
    Logger: {debug: jest.fn()}
}));

describe("mock-value-resolver", () => {
    describe("generateFakerMockValue", () => {
        it("should return the faker expression string for string arrays with the world name", () => {
            const result = generateFakerMockValue("string[]", "name");
            expect(result).toBe("[faker.person.fullName()]");
        });

        it("should return the faker expression string for string arrays with the world name", () => {
            const result = generateFakerMockValue("string[]", "something");
            expect(result).toBe("[faker.lorem.word()]");
        });

        it("should return the faker expression string for number arrays", () => {
            const result = generateFakerMockValue("number[]", "id");
            expect(result).toBe("[faker.number.int({ min: 1, max: 1000 })]");
        });

        it("should return the faker expression string for boolean arrays", () => {
            const result = generateFakerMockValue("boolean[]", "flag");
            expect(result).toBe("[faker.datatype.boolean()]");
        });

        it("should return the faker expression string for Date type", () => {
            const result = generateFakerMockValue("Date", "createdAt");
            expect(result).toBe("faker.date.recent()");
        });

        it("should return the faker expression string for string type but for a name", () => {
            const result = generateFakerMockValue("string", "name");
            expect(result).toBe("faker.person.fullName()");
        });

        it("should return the faker expression string for string type", () => {
            const result = generateFakerMockValue("string", "thing");
            expect(result).toBe("faker.lorem.word()");
        });

        it("should return the faker expression string for string type, but for a name", () => {
            const result = generateFakerMockValue("string", "name");
            expect(result).toBe("faker.person.fullName()");
        });

        it("should return the faker expression string for number type", () => {
            const result = generateFakerMockValue("number", "age");
            expect(result).toBe("faker.number.int({ min: 1, max: 1000 })");
        });

        it("should return the faker expression string for boolean type", () => {
            const result = generateFakerMockValue("boolean", "flag");
            expect(result).toBe("faker.datatype.boolean()");
        });

        it("should fallback to an empty object string for unknown types", () => {
            const result = generateFakerMockValue("object", "unknown");
            expect(result).toBe("{}");
        });
    });

    describe("generateStaticMockValue", () => {
        it("should generate static mock for string arrays", () => {
            expect(generateStaticMockValue("string[]", "name")).toBe('["example_name"]');
        });
        it("should generate static mock for number arrays", () => {
            expect(generateStaticMockValue("number[]", "id")).toBe("[0]");
        });
        it("should generate static mock for boolean arrays", () => {
            expect(generateStaticMockValue("boolean[]", "flag")).toBe("[true]");
        });
        it("should generate static mock for Date type", () => {
            expect(generateStaticMockValue("Date", "createdAt")).toBe("new Date()");
        });
        it("should generate static mock for string type", () => {
            expect(generateStaticMockValue("string", "name")).toBe('"example_name"');
        });
        it("should generate static mock for number type", () => {
            expect(generateStaticMockValue("number", "age")).toBe("0");
        });
        it("should fallback to {}", () => {
            expect(generateStaticMockValue("object", "field")).toBe("{}");
        });
    });

    describe("getMockValueForProperty", () => {
        const localInterfaces = new Set(["User", "Address"]);

        it("should generate factory call for array of local interface", () => {
            const result = getMockValueForProperty("users", "User[]", localInterfaces, false);
            expect(result).toBe("[UserFactory.create()]");
        });

        it("should generate factory call for local interface", () => {
            const result = getMockValueForProperty("user", "User", localInterfaces, false);
            expect(result).toBe("UserFactory.create()");
        });

        it("should generate faker array mock when useFakerDefaults=true", () => {
            const result = getMockValueForProperty("things", "string[]", localInterfaces, true);
            expect(result).toBe("[faker.lorem.word()]");
        });

        it("should generate faker array mock when useFakerDefaults=true, but for an email", () => {
            const result = getMockValueForProperty("emails", "string[]", localInterfaces, true);
            expect(result).toBe("[faker.internet.email()]");
        });

        it("should generate static array mock when useFakerDefaults=false", () => {
            const result = getMockValueForProperty("emails", "string[]", localInterfaces, false);
            expect(result).toBe('["example_emails"]');
        });

        it("should generate faker mock for primitive type when useFakerDefaults=true", () => {
            const result = getMockValueForProperty("thing", "string", localInterfaces, true);
            expect(result).toBe("faker.lorem.word()");
        });

        it("should generate faker mock for primitive type when useFakerDefaults=true, but for a name", () => {
            const result = getMockValueForProperty("name", "string", localInterfaces, true);
            expect(result).toBe("faker.person.fullName()");
        });

        it("should generate static mock for primitive type when useFakerDefaults=false", () => {
            const result = getMockValueForProperty("name", "string", localInterfaces, false);
            expect(result).toBe('"example_name"');
        });

        it("should apply fallback coercion for unknown structured type", () => {
            const result = getMockValueForProperty("custom", "CustomType", localInterfaces, false);
            expect(result).toBe("{} as unknown as CustomType");
        });

        it("should not coerce Date or primitives", () => {
            const result = getMockValueForProperty("date", "Date", localInterfaces, false);
            expect(result).toBe("new Date()");
        });
    });

    describe("getCodeGenFakerValueForKey", () => {
        it("should return faker.internet.email() for email-related keys", () => {
            expect(getCodeGenFakerValueForKey("emailAddress")).toBe("faker.internet.email()");
        });

        it("should return faker.person.fullName() for name-related keys", () => {
            expect(getCodeGenFakerValueForKey("fullName")).toBe("faker.person.fullName()");
        });

        it("should return faker.internet.url() for url-related keys", () => {
            expect(getCodeGenFakerValueForKey("profileUrl")).toBe("faker.internet.url()");
        });

        it("should return faker.string.uuid() for id-related keys", () => {
            expect(getCodeGenFakerValueForKey("userId")).toBe("faker.string.uuid()");
        });

        it("should return faker.phone.number() for phone-related keys", () => {
            expect(getCodeGenFakerValueForKey("phoneNumber")).toBe("faker.phone.number()");
        });

        it("should return faker.location.streetAddress() for address-related keys", () => {
            expect(getCodeGenFakerValueForKey("billingAddress")).toBe("faker.location.streetAddress()");
        });

        it("should return faker.location.city() for city-related keys", () => {
            expect(getCodeGenFakerValueForKey("city")).toBe("faker.location.city()");
        });

        it("should return faker.location.country() for country-related keys", () => {
            expect(getCodeGenFakerValueForKey("countryCode")).toBe("faker.location.country()");
        });

        it("should return faker.commerce.price() for amount/price-related keys", () => {
            expect(getCodeGenFakerValueForKey("amountDue")).toBe("faker.commerce.price()");
            expect(getCodeGenFakerValueForKey("totalPrice")).toBe("faker.commerce.price()");
        });

        it("should return null for unknown keys", () => {
            expect(getCodeGenFakerValueForKey("randomField")).toBeNull();
        });

        it("should call Logger.debug each time", () => {
            getCodeGenFakerValueForKey("emailAddress");
            expect(Logger.debug).toHaveBeenCalledWith(
                "getCodeGenFakerValueForKey",
                expect.stringContaining("Getting faker value")
            );
        });
    });

    describe('getRuntimeFakerValueForKey', () => {
        it('should generate a fake email', () => {
            expect(getRuntimeFakerValueForKey('userEmail')).toMatch(/@/);
        });

        it('should generate a fake name', () => {
            expect(typeof getRuntimeFakerValueForKey('customerName')).toBe('string');
        });

        it('should generate a fake url', () => {
            expect(getRuntimeFakerValueForKey('profileUrl')).toMatch(/^http/);
        });

        it('should return null if no match found', () => {
            expect(getRuntimeFakerValueForKey('somethingElse')).toBeNull();
        });

        it('should generate a fake uuid for id-related keys', () => {
            const result = getRuntimeFakerValueForKey('userId');
            expect(typeof result).toBe('string');
            expect(result!.length).toBeGreaterThan(10);
        });

        it('should generate a fake phone number', () => {
            const result = getRuntimeFakerValueForKey('contactPhone');
            expect(typeof result).toBe('string');
            expect(result).toMatch(/\d/);
        });

        it('should generate a fake street address', () => {
            const result = getRuntimeFakerValueForKey('billingAddress');
            expect(typeof result).toBe('string');
            expect(result!.length).toBeGreaterThan(5);
        });

        it('should generate a fake city', () => {
            const result = getRuntimeFakerValueForKey('cityName');
            expect(typeof result).toBe('string');
            expect(result!.length).toBeGreaterThan(2);
        });

        it('should generate a fake country', () => {
            const result = getRuntimeFakerValueForKey('countryCode');
            expect(typeof result).toBe('string');
            expect(result!.length).toBeGreaterThan(2);
        });

        it('should generate a fake price for amount/price-related keys', () => {
            const result = getRuntimeFakerValueForKey('totalAmount');
            expect(typeof result).toBe('string');
            expect(parseFloat(result!)).not.toBeNaN();
        });

        it('should call Logger.debug when invoked', () => {
            getRuntimeFakerValueForKey('email');
            expect(Logger.debug).toHaveBeenCalledWith(
                'getRuntimeFakerValueForKey',
                expect.stringContaining('String identified at key')
            );
        });
    });
});
