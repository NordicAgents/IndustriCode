/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 2/5/2024
 * Time: 5:18 PM
 * 
 */
using System;
using System.ComponentModel;
using System.Collections;
using NxtControl.GuiFramework;

namespace HMI.Main.Symbols.NodeFinder
{
	/// <summary>
	/// Summary description for sDefault.
	/// </summary>
	partial class sDefault
	{

		#region Component Designer generated code
		/// <summary>
		/// Required method for Designer support - do not modify
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
			this.FindNodeButton = new NxtControl.GuiFramework.DrawnButton();
			this.freeText1 = new NxtControl.GuiFramework.FreeText();
			this.freeText2 = new NxtControl.GuiFramework.FreeText();
			this.rectangle1 = new NxtControl.GuiFramework.Rectangle();
			this.SkillNameBox = new NxtControl.GuiFramework.DrawnTextBox();
			this.FilePathBox = new NxtControl.GuiFramework.DrawnTextBox();
			this.IN1Box = new NxtControl.GuiFramework.DrawnTextBox();
			this.SkillCMDBox = new NxtControl.GuiFramework.DrawnTextBox();
			this.OUT1Box = new NxtControl.GuiFramework.DrawnTextBox();
			this.CurrentStateBox = new NxtControl.GuiFramework.DrawnTextBox();
			// 
			// FindNodeButton
			// 
			this.FindNodeButton.Bounds = new NxtControl.Drawing.RectF(((float)(64D)), ((float)(216D)), ((float)(232D)), ((float)(25D)));
			this.FindNodeButton.Brush = new NxtControl.Drawing.Brush("ButtonBrush");
			this.FindNodeButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.FindNodeButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.FindNodeButton.Name = "FindNodeButton";
			this.FindNodeButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.FindNodeButton.Radius = 4D;
			this.FindNodeButton.Text = "Find Node IDs";
			this.FindNodeButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.FindNodeButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.FindNodeButton.Use3DEffect = false;
			this.FindNodeButton.Click += new System.EventHandler(this.FindNodeClick);
			// 
			// freeText1
			// 
			this.freeText1.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText1.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText1.Location = new NxtControl.Drawing.PointF(64D, 72D);
			this.freeText1.Name = "freeText1";
			this.freeText1.Text = "Skill Name";
			// 
			// freeText2
			// 
			this.freeText2.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText2.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText2.Location = new NxtControl.Drawing.PointF(64D, 152D);
			this.freeText2.Name = "freeText2";
			this.freeText2.Text = "File Path";
			// 
			// rectangle1
			// 
			this.rectangle1.Bounds = new NxtControl.Drawing.RectF(((float)(40D)), ((float)(40D)), ((float)(544D)), ((float)(256D)));
			this.rectangle1.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle1.Name = "rectangle1";
			// 
			// SkillNameBox
			// 
			this.SkillNameBox.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.SkillNameBox.Bounds = new NxtControl.Drawing.RectF(((float)(64D)), ((float)(96D)), ((float)(228D)), ((float)(25D)));
			this.SkillNameBox.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.SkillNameBox.FontScale = true;
			this.SkillNameBox.Maximum = 100D;
			this.SkillNameBox.Minimum = 0D;
			this.SkillNameBox.Name = "SkillNameBox";
			this.SkillNameBox.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.SkillNameBox.TextAutoSizeHorizontalOffset = 10;
			this.SkillNameBox.TextAutoSizeVerticalOffset = 2;
			this.SkillNameBox.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// FilePathBox
			// 
			this.FilePathBox.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.FilePathBox.Bounds = new NxtControl.Drawing.RectF(((float)(64D)), ((float)(176D)), ((float)(228D)), ((float)(25D)));
			this.FilePathBox.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.FilePathBox.FontScale = true;
			this.FilePathBox.Maximum = 100D;
			this.FilePathBox.Minimum = 0D;
			this.FilePathBox.Name = "FilePathBox";
			this.FilePathBox.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.FilePathBox.TextAutoSizeHorizontalOffset = 10;
			this.FilePathBox.TextAutoSizeVerticalOffset = 2;
			this.FilePathBox.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// IN1Box
			// 
			this.IN1Box.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.IN1Box.Bounds = new NxtControl.Drawing.RectF(((float)(400D)), ((float)(88D)), ((float)(152D)), ((float)(25D)));
			this.IN1Box.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.IN1Box.FontScale = true;
			this.IN1Box.Maximum = 100D;
			this.IN1Box.Minimum = 0D;
			this.IN1Box.Name = "IN1Box";
			this.IN1Box.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.IN1Box.TextAutoSizeHorizontalOffset = 10;
			this.IN1Box.TextAutoSizeVerticalOffset = 2;
			this.IN1Box.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// SkillCMDBox
			// 
			this.SkillCMDBox.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.SkillCMDBox.Bounds = new NxtControl.Drawing.RectF(((float)(400D)), ((float)(136D)), ((float)(152D)), ((float)(25D)));
			this.SkillCMDBox.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.SkillCMDBox.FontScale = true;
			this.SkillCMDBox.Maximum = 100D;
			this.SkillCMDBox.Minimum = 0D;
			this.SkillCMDBox.Name = "SkillCMDBox";
			this.SkillCMDBox.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.SkillCMDBox.TextAutoSizeHorizontalOffset = 10;
			this.SkillCMDBox.TextAutoSizeVerticalOffset = 2;
			this.SkillCMDBox.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// OUT1Box
			// 
			this.OUT1Box.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.OUT1Box.Bounds = new NxtControl.Drawing.RectF(((float)(400D)), ((float)(184D)), ((float)(152D)), ((float)(25D)));
			this.OUT1Box.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.OUT1Box.FontScale = true;
			this.OUT1Box.Maximum = 100D;
			this.OUT1Box.Minimum = 0D;
			this.OUT1Box.Name = "OUT1Box";
			this.OUT1Box.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.OUT1Box.TextAutoSizeHorizontalOffset = 10;
			this.OUT1Box.TextAutoSizeVerticalOffset = 2;
			this.OUT1Box.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// CurrentStateBox
			// 
			this.CurrentStateBox.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.CurrentStateBox.Bounds = new NxtControl.Drawing.RectF(((float)(400D)), ((float)(232D)), ((float)(152D)), ((float)(25D)));
			this.CurrentStateBox.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.CurrentStateBox.FontScale = true;
			this.CurrentStateBox.Maximum = 100D;
			this.CurrentStateBox.Minimum = 0D;
			this.CurrentStateBox.Name = "CurrentStateBox";
			this.CurrentStateBox.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.CurrentStateBox.TextAutoSizeHorizontalOffset = 10;
			this.CurrentStateBox.TextAutoSizeVerticalOffset = 2;
			this.CurrentStateBox.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// sDefault
			// 
			this.Name = "sDefault";
			this.Shapes.AddRange(new System.ComponentModel.IComponent[] {
			this.rectangle1,
			this.FindNodeButton,
			this.freeText1,
			this.freeText2,
			this.SkillNameBox,
			this.FilePathBox,
			this.IN1Box,
			this.SkillCMDBox,
			this.OUT1Box,
			this.CurrentStateBox});
			this.SymbolSize = new System.Drawing.Size(752, 496);

		}
		private NxtControl.GuiFramework.Rectangle rectangle1;
		private NxtControl.GuiFramework.DrawnButton FindNodeButton;
		private NxtControl.GuiFramework.FreeText freeText1;
		private NxtControl.GuiFramework.FreeText freeText2;
		private NxtControl.GuiFramework.DrawnTextBox SkillNameBox;
		private NxtControl.GuiFramework.DrawnTextBox FilePathBox;
		private NxtControl.GuiFramework.DrawnTextBox IN1Box;
		private NxtControl.GuiFramework.DrawnTextBox SkillCMDBox;
		private NxtControl.GuiFramework.DrawnTextBox OUT1Box;
		private NxtControl.GuiFramework.DrawnTextBox CurrentStateBox;
		#endregion
	}
}
