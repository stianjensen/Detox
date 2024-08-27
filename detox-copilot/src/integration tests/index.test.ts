import { copilot } from "@/index";
import { CopilotError } from '@/errors/CopilotError';
import { Copilot } from "@/Copilot";
import { CodeEvaluationError } from "@/errors/CodeEvaluationError";

describe('Integration', () => {
    let mockFrameworkDriver: jest.Mocked<TestingFrameworkDriver>;
    let mockPromptHandler: jest.Mocked<PromptHandler>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockFrameworkDriver = {
            takeSnapshot: jest.fn().mockResolvedValue('mock_snapshot'),
            getViewHierarchy: jest.fn().mockResolvedValue('<view><button>Login</button></view>'),
            availableAPI: {
                matchers: [],
                actions: [],
                assertions: []
            }
        };

        mockPromptHandler = {
            runPrompt: jest.fn()
        };

        copilot.init({
            frameworkDriver: mockFrameworkDriver,
            promptHandler: mockPromptHandler
        });
    });

    describe('Initialization', () => {
        beforeEach(() => {
            // Reset Copilot instance before each test
            Copilot['instance'] = undefined;
        });

        it('should throw an error when act is called before initialization', async () => {
            await expect(copilot.act('Some action')).rejects.toThrow();
        });

        it('should throw an error when expect is called before initialization', async () => {
            await expect(copilot.act('Some assertion')).rejects.toThrow();
        });
    });

    describe('act method', () => {
        it('should successfully perform an action', async () => {
            mockPromptHandler.runPrompt.mockResolvedValue('// No operation');

            await expect(copilot.act('Tap on the login button')).resolves.not.toThrow();

            expect(mockFrameworkDriver.takeSnapshot).toHaveBeenCalled();
            expect(mockFrameworkDriver.getViewHierarchy).toHaveBeenCalledWith();

            expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
                expect.stringContaining('Tap on the login button'),
                'mock_snapshot'
            );
        });

        it('should handle errors during action execution', async () => {
            mockPromptHandler.runPrompt.mockResolvedValue('throw new Error("Element not found");');

            await expect(copilot.act('Tap on a non-existent button')).rejects.toThrow(CopilotError);
        });
    });

    describe('expect method', () => {
        it('should successfully perform an expectation', async () => {
            mockPromptHandler.runPrompt.mockResolvedValue('// No operation');

            await copilot.assert('The welcome message should be visible');

            expect(mockFrameworkDriver.takeSnapshot).toHaveBeenCalled();
            expect(mockFrameworkDriver.getViewHierarchy).toHaveBeenCalled();
            expect(mockPromptHandler.runPrompt).toHaveBeenCalledWith(
                expect.stringContaining('The welcome message should be visible'),
                'mock_snapshot'
            );
        });

        it('should handle errors during expectation execution', async () => {
            mockPromptHandler.runPrompt.mockResolvedValue('throw new Error("Element not found");');

            await expect(copilot.assert('The welcome message should be visible')).rejects.toThrow(CopilotError);
        });

        it('should handle errors during code evaluation', async () => {
            mockPromptHandler.runPrompt.mockResolvedValue('foobar');

            await expect(copilot.assert('The welcome message should be visible')).rejects.toThrow(CodeEvaluationError);
        });
    });

    describe('error handling', () => {
        it('should throw error when PromptHandler fails', async () => {
            mockPromptHandler.runPrompt.mockRejectedValue(new Error('API error'));

            await expect(copilot.act('Perform action')).rejects.toThrow(/API error/);
        });

        it('should throw error when takeSnapshot fails', async () => {
            mockFrameworkDriver.takeSnapshot.mockRejectedValue(new Error('API error'));

            await expect(copilot.act('Perform action')).rejects.toThrow(/API error/);
        });

        it('should throw error when getViewHierarchy fails', async () => {
            mockFrameworkDriver.getViewHierarchy.mockRejectedValue(new Error('API error'));

            await expect(copilot.act('Perform action')).rejects.toThrow(/API error/);
        });
    });
});
