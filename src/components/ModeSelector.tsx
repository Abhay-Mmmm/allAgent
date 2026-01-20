import { Language, AppMode } from '@/types/chat';
import { Smartphone, Globe, ChevronRight } from 'lucide-react';

interface ModeSelectorProps {
    onSelectMode: (mode: AppMode) => void;
    language: Language;
}

export const ModeSelector = ({ onSelectMode, language }: ModeSelectorProps) => {
    const modes = [
        {
            id: 'web' as AppMode,
            icon: Globe,
            title: language === 'hi' ? 'वेब एजेंट' : 'Web Agent',
            description: language === 'hi'
                ? 'ब्राउज़र में पूर्ण-विशेषता वाला सहायक'
                : 'Full-featured assistant in browser',
            gradient: 'from-blue-500 to-cyan-500',
        },
        {
            id: 'mobile' as AppMode,
            icon: Smartphone,
            title: language === 'hi' ? 'मोबाइल ऐप' : 'Mobile App',
            description: language === 'hi'
                ? 'मोबाइल उपकरणों के लिए अनुकूलित'
                : 'Optimized for mobile devices',
            gradient: 'from-purple-500 to-pink-500',
        },
    ];

    return (
        <div className="space-y-4">
            <h2 className="text-accessible-lg font-semibold text-foreground text-center mb-6">
                {language === 'hi' ? 'अपना मोड चुनें' : 'Choose Your Mode'}
            </h2>

            {modes.map(({ id, icon: Icon, title, description, gradient }) => (
                <button
                    key={id}
                    onClick={() => onSelectMode(id)}
                    className="
            w-full flex items-center gap-4 
            bg-card rounded-2xl p-5 
            card-shadow hover:shadow-soft-lg 
            transition-all duration-300
            border-2 border-transparent hover:border-primary/20
            group
          "
                >
                    <div className={`
            w-14 h-14 rounded-xl 
            bg-gradient-to-br ${gradient}
            flex items-center justify-center
            group-hover:scale-105 transition-transform
          `}>
                        <Icon className="w-7 h-7 text-white" />
                    </div>

                    <div className="flex-1 text-left">
                        <p className="font-semibold text-foreground text-accessible-base">{title}</p>
                        <p className="text-muted-foreground text-sm">{description}</p>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>
            ))}
        </div>
    );
};
