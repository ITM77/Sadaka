'use client';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const sections = [
    {
      title: 'Продукт',
      links: ['Главная', 'О проекте', 'Мечети', 'Контакты'],
    },
    {
      title: 'Приложения',
      links: ['iOS App Store', 'Android Play Store', 'Веб-версия', 'Admin Panel'],
    },
    {
      title: 'Правовые',
      links: ['Политика конфиденциальности', 'Условия использования', 'Лицензия', 'FAQ'],
    },
    {
      title: 'Компания',
      links: ['О нас', 'Блог', 'Карьера', 'Пресс'],
    },
  ];

  return (
    <footer className="bg-dark-900 text-dark-100 pt-16 pb-8 border-t border-dark-800">
      <div className="container-custom">
        {/* Main footer */}
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🕌</span>
              <span className="text-xl font-bold text-gradient-light">Садака</span>
            </div>
            <p className="text-dark-400 text-sm leading-relaxed">
              Цифровая платформа для прозрачных и доверенных пожертвований в мечетях Таджикистана.
            </p>
            {/* Social links */}
            <div className="flex gap-3 mt-6">
              {[
                { icon: 'f', label: 'Facebook' },
                { icon: '📷', label: 'Instagram' },
                { icon: '𝕏', label: 'Twitter' },
                { icon: '✈️', label: 'Telegram' },
              ].map((social, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-lg bg-dark-800 hover:bg-primary-600 flex items-center justify-center transition-colors"
                  aria-label={social.label}
                >
                  <span className="text-sm">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links sections */}
          {sections.map((section, i) => (
            <div key={i} className="col-span-1">
              <h4 className="font-semibold text-white mb-4">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href="#"
                      className="text-dark-400 hover:text-primary-400 transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-dark-800 my-8"></div>

        {/* Bottom footer */}
        <div className="flex flex-col md:flex-row justify-between items-center text-dark-400 text-sm">
          <p>© {currentYear} Садака. Все права защищены.</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 md:mt-0">
            <a href="#" className="hover:text-primary-400 transition-colors">
              Политика конфиденциальности
            </a>
            <a href="#" className="hover:text-primary-400 transition-colors">
              Условия использования
            </a>
            <a href="#" className="hover:text-primary-400 transition-colors">
              Cookie политика
            </a>
          </div>
        </div>

        {/* Version */}
        <div className="text-center text-dark-500 text-xs mt-6">
          Версия 0.1.0 • Сделано в Таджикистане 🇹🇯
        </div>
      </div>
    </footer>
  );
}
