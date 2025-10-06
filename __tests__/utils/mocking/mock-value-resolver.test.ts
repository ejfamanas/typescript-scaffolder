import {
    generateFakerMockValue,
    generateStaticMockValue,
    getMockValueForProperty
} from "../../../src/utils/mocking/mock-value-resolver";

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
});