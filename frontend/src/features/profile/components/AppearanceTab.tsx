import { Form } from "../../../components/ui";
import { ThemePreference, useTheme } from "../../../utils/ThemeUtils";

const options: { value: ThemePreference; label: string; description: string }[] = [
    { value: "system", label: "System", description: "Follow your device settings" },
    { value: "light", label: "Light", description: "Always use the light theme" },
    { value: "dark", label: "Dark", description: "Always use the dark theme" }
];

/** Color theme setting; stored per browser, applied immediately. */
const AppearanceTab = () => {
    const { preference, setThemePreference } = useTheme();

    return (
        <div>
            <h6 className="mb-3">Theme</h6>
            {options.map(option => (
                <Form.Check
                    key={option.value}
                    type="radio"
                    id={`wb-profile-theme-${option.value}`}
                    name="wb-profile-theme"
                    className="mb-2"
                    checked={preference === option.value}
                    onChange={() => setThemePreference(option.value)}
                    label={
                        <>
                            {option.label}
                            <div className="small text-body-secondary">{option.description}</div>
                        </>
                    }
                />
            ))}
            <p className="small text-body-secondary mt-3">This setting is saved on this device only.</p>
        </div>
    );
};

export default AppearanceTab;
