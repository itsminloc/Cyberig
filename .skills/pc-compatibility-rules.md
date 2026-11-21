# PC Compatibility Engine Rules (Quy Tắc Tương Thích Linh Kiện)

Tài liệu này định nghĩa các quy tắc kiểm tra tính tương thích giữa các linh kiện phần cứng khi người dùng cấu hình máy tính (Custom PC Builder) trong CyberRig.

---

## 1. CPU & Motherboard (Bo Mạch Chủ)
- **Socket Match**: Socket của CPU phải khớp 100% với Socket của Motherboard (Ví dụ: `LGA1700`, `AM5`, `AM4`, `LGA1200`).
- **Chipset Compatibility**: Chipset bo mạch chủ phải hỗ trợ thế hệ CPU (Ví dụ: CPU Intel Gen 14 yêu cầu bo mạch series 600/700 kèm cập nhật BIOS thích hợp).
- **TDP & VRM**: CPU có TDP cao (>= 125W) cần cảnh báo nếu dùng với bo mạch chủ phổ thông (H610/A620) do nghẽn VRM.

---

## 2. RAM & Motherboard / CPU
- **DDR Generation**: Loại RAM (DDR4 / DDR5) phải tương thích hoàn toàn với khe cắm trên bo mạch chủ.
- **Slot Count**: Tổng số thanh RAM chọn không được vượt quá số khe RAM vật lý trên Mainboard (`slots <= max_slots`, thường là 2 hoặc 4 khe).
- **Max Capacity**: Tổng dung lượng RAM (`GB`) không vượt quá dung lượng tối đa mainboard & CPU hỗ trợ.
- **Speed (MHz / MT/s)**: Báo cảnh báo nếu bus RAM vượt mức hỗ trợ chuẩn (XMP/EXPO).

---

## 3. GPU (Card Đồ Họa) & Case (Vỏ Máy) & Motherboard
- **Length Clearance**: Chiều dài GPU (`gpu_length_mm`) phải nhỏ hơn khoảng trống tối đa của case (`case_max_gpu_length_mm` - tối thiểu 10mm dự phòng).
- **Slot Width**: Độ dày card đồ họa (2-slot, 3-slot, 3.5-slot) không được cấn các khe PCIe cần sử dụng khác và phù hợp với số slot mở rộng của case.
- **PCIe Interface**: Đảm bảo Mainboard có ít nhất một khe PCIe x16.

---

## 4. PSU (Bộ Nguồn) & Toàn Hệ Thống
- **Estimated Total Wattage**:
  $$\text{Wattage}_{estimated} = \text{TDP}_{CPU} + \text{TDP}_{GPU} + \text{Wattage}_{Motherboard} (\sim 50W) + \text{RAM/SSD/Fans} (\sim 50W)$$
- **Recommended PSU Wattage**:
  $$\text{Wattage}_{PSU} \ge \text{Wattage}_{estimated} \times 1.25 \quad (\text{đệm an toàn } 25\% - 30\%)$$
- **GPU Power Connectors**: Nguồn phải cung cấp đủ đầu cấp nguồn PCIe (8-pin, 6+2 pin, hoặc chuẩn mới 12VHPWR / PCIe Gen 5 16-pin) theo yêu cầu của GPU.

---

## 5. CPU Cooler (Tản Nhiệt) & CPU / Case / RAM
- **Socket Support**: Tản nhiệt phải có gông/ngàm hỗ trợ socket của CPU.
- **Air Cooler Height Clearance**: Chiều cao tản khí (`cooler_height_mm`) phải $\le$ `case_max_cpu_cooler_height_mm`.
- **AIO Radiator Support**: Kích thước tản nhiệt nước (120mm, 240mm, 280mm, 360mm, 420mm) phải được case hỗ trợ ở ít nhất một vị trí (Top, Front, Side).
- **RAM Clearance**: Tản khí kích thước lớn (dual tower) cần kiểm tra cấn tản nhiệt thanh RAM cao.

---

## 6. Storage (Ổ Cứng)
- **M.2 NVMe Slots**: Số lượng ổ M.2 chọn không được vượt quá số khe cắm M.2 khả dụng trên bo mạch chủ.
- **SATA Ports**: Số lượng ổ cứng SATA 2.5"/3.5" không vượt quá số cổng SATA và khay lắp đặt của Case.
