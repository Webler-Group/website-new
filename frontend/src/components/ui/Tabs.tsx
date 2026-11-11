import {
    Children,
    createContext,
    HTMLAttributes,
    isValidElement,
    ReactElement,
    ReactNode,
    useContext,
    useEffect,
    useRef,
    useState
} from "react";
import { cx } from "./utils";

/* ---------------------------------------------------------------------------------------------
 * Tab.Container / Tab.Content / Tab.Pane – custom layouts where the navigation is built with <Nav>
 * ------------------------------------------------------------------------------------------- */

interface TabContextValue {
    activeKey?: string;
    onSelect: (key: string) => void;
}

export const TabContext = createContext<TabContextValue | null>(null);

interface TabContainerProps {
    activeKey?: string;
    defaultActiveKey?: string;
    onSelect?: (key: string | null) => void;
    children?: ReactNode;
}

function TabContainer({ activeKey: controlledKey, defaultActiveKey, onSelect, children }: TabContainerProps) {
    const [uncontrolledKey, setUncontrolledKey] = useState(defaultActiveKey);
    const activeKey = controlledKey ?? uncontrolledKey;

    const handleSelect = (key: string) => {
        if (controlledKey === undefined) setUncontrolledKey(key);
        onSelect?.(key);
    };

    return <TabContext.Provider value={{ activeKey, onSelect: handleSelect }}>{children}</TabContext.Provider>;
}

function TabContent({ className, ...props }: Omit<HTMLAttributes<HTMLDivElement>, "style">) {
    return <div className={cx("tab-content", className)} {...props} />;
}

interface TabPaneProps extends Omit<HTMLAttributes<HTMLDivElement>, "style"> {
    eventKey: string;
}

function TabPane({ eventKey, className, ...props }: TabPaneProps) {
    const ctx = useContext(TabContext);
    const active = ctx?.activeKey === eventKey;
    return <div role="tabpanel" className={cx("tab-pane", active && "active show", className)} {...props} />;
}

/* ---------------------------------------------------------------------------------------------
 * <Tabs> with <Tab> children – renders the tab navigation automatically
 * ------------------------------------------------------------------------------------------- */

interface TabProps {
    eventKey: string;
    title: ReactNode;
    disabled?: boolean;
    className?: string;
    /** Called right before the tab becomes active */
    onEnter?: () => void;
    /** Called after the tab became active (its pane is visible) */
    onEntered?: () => void;
    /** Called when the tab stops being active */
    onExit?: () => void;
    children?: ReactNode;
}

/** Only used as a declarative child of <Tabs>; rendering is done by <Tabs>. */
export function Tab(_props: TabProps): ReactElement | null {
    return null;
}

Tab.Container = TabContainer;
Tab.Content = TabContent;
Tab.Pane = TabPane;

interface TabsProps {
    activeKey?: string;
    defaultActiveKey?: string;
    onSelect?: (key: string | null) => void;
    variant?: "tabs" | "pills" | "underline";
    fill?: boolean;
    justify?: boolean;
    className?: string;
    children?: ReactNode;
}

export function Tabs({
    activeKey: controlledKey,
    defaultActiveKey,
    onSelect,
    variant = "tabs",
    fill,
    justify,
    className,
    children
}: TabsProps) {
    const tabs = Children.toArray(children).filter(
        (child): child is ReactElement<TabProps> => isValidElement(child) && child.type === Tab
    );

    const [uncontrolledKey, setUncontrolledKey] = useState(defaultActiveKey ?? tabs[0]?.props.eventKey);
    const activeKey = controlledKey ?? uncontrolledKey;

    // Fire lifecycle callbacks of the tabs when the active key changes
    const previousKeyRef = useRef<string | undefined>(activeKey);
    const tabsRef = useRef(tabs);
    tabsRef.current = tabs;

    useEffect(() => {
        const previousKey = previousKeyRef.current;
        if (previousKey === activeKey) return;
        const find = (key?: string) => tabsRef.current.find(tab => tab.props.eventKey === key)?.props;
        if (previousKey !== undefined) find(previousKey)?.onExit?.();
        const entering = find(activeKey);
        entering?.onEnter?.();
        entering?.onEntered?.();
        previousKeyRef.current = activeKey;
    }, [activeKey]);

    const handleSelect = (key: string) => {
        if (controlledKey === undefined) setUncontrolledKey(key);
        onSelect?.(key);
    };

    return (
        <>
            <ul role="tablist" className={cx("nav", `nav-${variant}`, fill && "nav-fill", justify && "nav-justified", className)}>
                {tabs.map(tab => (
                    <li key={tab.props.eventKey} className="nav-item" role="presentation">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab.props.eventKey === activeKey}
                            disabled={tab.props.disabled}
                            className={cx("nav-link", tab.props.eventKey === activeKey && "active", tab.props.disabled && "disabled")}
                            onClick={() => handleSelect(tab.props.eventKey)}
                        >
                            {tab.props.title}
                        </button>
                    </li>
                ))}
            </ul>
            <div className="tab-content">
                {tabs.map(tab => (
                    <div
                        key={tab.props.eventKey}
                        role="tabpanel"
                        className={cx("tab-pane", tab.props.eventKey === activeKey && "active show", tab.props.className)}
                    >
                        {tab.props.children}
                    </div>
                ))}
            </div>
        </>
    );
}

export default Tabs;
