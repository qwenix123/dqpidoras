import SwiftUI

struct ContentView: View {
    @State private var showInject = false
    @State private var showGuide = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 16) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(Color(white: 0.08))
                            .frame(width: 96, height: 96)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .stroke(Color.white.opacity(0.16), lineWidth: 1)
                            )

                        Image("AppLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 72, height: 72)
                    }

                    Text("Ch3ss Client")
                        .font(.system(size: 26, weight: .bold, design: .default))
                        .tracking(0.4)
                        .foregroundColor(.white)
                }

                Spacer().frame(height: 44)

                VStack(spacing: 14) {
                    Button(action: { showInject = true }) {
                        HStack(spacing: 10) {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 15, weight: .semibold))
                            Text("Inject")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }

                    Button(action: { showGuide = true }) {
                        HStack(spacing: 10) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 15, weight: .semibold))
                            Text("Инструкция")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color(white: 0.09))
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(Color.white.opacity(0.18), lineWidth: 1)
                        )
                    }
                }
                .padding(.horizontal, 28)

                Spacer()
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showInject) {
            InjectSheetView()
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showGuide) {
            GuideSheetView()
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }
}

struct InjectSheetView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color(white: 0.04).ignoresSafeArea()

            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    HStack(spacing: 10) {
                        Image(systemName: "puzzlepiece.extension")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundColor(.white)
                        Text("Inject в Safari")
                            .font(.system(size: 19, weight: .bold))
                            .foregroundColor(.white)
                    }
                    Spacer()
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white.opacity(0.7))
                            .frame(width: 32, height: 32)
                            .background(Color.white.opacity(0.08))
                            .clipShape(Circle())
                    }
                }

                VStack(alignment: .leading, spacing: 14) {
                    StepItem(num: "1", text: "Открой Настройки iPhone → Приложения → Safari → Расширения (на iOS 16–17: Настройки → Safari → Расширения)")
                    StepItem(num: "2", text: "Выбери Ch3ss Client, включи тумблер и поставь «Разрешить» для chess.com")
                    StepItem(num: "3", text: "Открой chess.com в Safari, нажми значок расширений в адресной строке и открой панель Ch3ss Client")
                }
                .padding(16)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )

                VStack(spacing: 12) {
                    Button(action: {
                        if let url = URL(string: "https://www.chess.com/play/online") {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "safari")
                            Text("Открыть chess.com в Safari")
                                .fontWeight(.semibold)
                        }
                        .font(.system(size: 15))
                        .foregroundColor(.black)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }

                    Button(action: {
                        if let url = URL(string: UIApplication.openSettingsURLString) {
                            UIApplication.shared.open(url)
                        }
                    }) {
                        HStack(spacing: 8) {
                            Image(systemName: "gearshape")
                            Text("Открыть Настройки")
                                .fontWeight(.semibold)
                        }
                        .font(.system(size: 15))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.white.opacity(0.08))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(Color.white.opacity(0.18), lineWidth: 1)
                        )
                    }
                }

                Spacer()
            }
            .padding(24)
        }
        .preferredColorScheme(.dark)
    }
}

struct GuideSheetView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color(white: 0.04).ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 22) {
                    HStack {
                        HStack(spacing: 10) {
                            Image(systemName: "doc.text")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundColor(.white)
                            Text("Инструкция")
                                .font(.system(size: 19, weight: .bold))
                                .foregroundColor(.white)
                        }
                        Spacer()
                        Button(action: { dismiss() }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(.white.opacity(0.7))
                                .frame(width: 32, height: 32)
                                .background(Color.white.opacity(0.08))
                                .clipShape(Circle())
                        }
                    }

                    GuideBlock(
                        title: "Подключение расширения",
                        items: [
                            "Перейди в Настройки → Приложения → Safari → Расширения (или Настройки → Safari → Расширения).",
                            "Открой Ch3ss Client и включи «Разрешить расширение» (в том числе для Частного доступа при необходимости).",
                            "В списке веб-сайтов ниже выбери «Разрешить» для chess.com."
                        ]
                    )

                    GuideBlock(
                        title: "Запуск в игре",
                        items: [
                            "Зайди на chess.com в браузере Safari и войди в свой аккаунт.",
                            "Нажми кнопку с пазлом или «аА» в адресной строке Safari и выбери Ch3ss Client.",
                            "Откроется фирменное меню с мини-доской, режимами (Легит, Про, Human Safe, AutoWin), Humanizer и профилями Configs.",
                            "Нажми «Запустить» — движок Stockfish встроен локально и работает без задержек сети."
                        ]
                    )
                }
                .padding(24)
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct StepItem: View {
    let num: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(num)
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.black)
                .frame(width: 22, height: 22)
                .background(Color.white)
                .clipShape(Circle())

            Text(text)
                .font(.system(size: 14))
                .foregroundColor(.white.opacity(0.88))
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

struct GuideBlock: View {
    let title: String
    let items: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(0.8)
                .foregroundColor(.white.opacity(0.45))

            VStack(alignment: .leading, spacing: 10) {
                ForEach(Array(items.enumerated()), id: \.offset) { idx, item in
                    StepItem(num: "\(idx + 1)", text: item)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }
}
