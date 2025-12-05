/*
 * Created by EcoStruxure Automation Expert.
 * User: midxav
 * Date: 2/13/2024
 * Time: 10:39 AM
 * 
 */
using System;
using System.ComponentModel;
using System.Collections;
using NxtControl.GuiFramework;

namespace HMI.Main.Symbols.RegisterSkill
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
			this.rectangle1 = new NxtControl.GuiFramework.Rectangle();
			this.SkillNameBox1 = new NxtControl.GuiFramework.DrawnTextBox();
			this.RepoNameBox1 = new NxtControl.GuiFramework.DrawnTextBox();
			this.skillCMDBox1 = new NxtControl.GuiFramework.DrawnTextBox();
			this.inBox1 = new NxtControl.GuiFramework.DrawnTextBox();
			this.currentStateBox1 = new NxtControl.GuiFramework.DrawnTextBox();
			this.outBox1 = new NxtControl.GuiFramework.DrawnTextBox();
			this.messageBox = new NxtControl.GuiFramework.DrawnTextBox();
			this.InsertSkillButton = new NxtControl.GuiFramework.DrawnButton();
			this.EndpointBox1 = new NxtControl.GuiFramework.DrawnTextBox();
			this.freeText1 = new NxtControl.GuiFramework.FreeText();
			this.freeText2 = new NxtControl.GuiFramework.FreeText();
			this.freeText3 = new NxtControl.GuiFramework.FreeText();
			// 
			// rectangle1
			// 
			this.rectangle1.Bounds = new NxtControl.Drawing.RectF(((float)(40D)), ((float)(64D)), ((float)(552D)), ((float)(272D)));
			this.rectangle1.Font = new NxtControl.Drawing.Font("HMI Sans Serif", 9F, System.Drawing.FontStyle.Regular);
			this.rectangle1.Name = "rectangle1";
			// 
			// SkillNameBox1
			// 
			this.SkillNameBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.SkillNameBox1.Bounds = new NxtControl.Drawing.RectF(((float)(128D)), ((float)(88D)), ((float)(192D)), ((float)(25D)));
			this.SkillNameBox1.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.SkillNameBox1.FontScale = true;
			this.SkillNameBox1.Maximum = 100D;
			this.SkillNameBox1.Minimum = 0D;
			this.SkillNameBox1.Name = "SkillNameBox1";
			this.SkillNameBox1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.SkillNameBox1.TextAutoSizeHorizontalOffset = 10;
			this.SkillNameBox1.TextAutoSizeVerticalOffset = 2;
			this.SkillNameBox1.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// RepoNameBox1
			// 
			this.RepoNameBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.RepoNameBox1.Bounds = new NxtControl.Drawing.RectF(((float)(128D)), ((float)(128D)), ((float)(192D)), ((float)(25D)));
			this.RepoNameBox1.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.RepoNameBox1.FontScale = true;
			this.RepoNameBox1.Maximum = 100D;
			this.RepoNameBox1.Minimum = 0D;
			this.RepoNameBox1.Name = "RepoNameBox1";
			this.RepoNameBox1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.RepoNameBox1.TextAutoSizeHorizontalOffset = 10;
			this.RepoNameBox1.TextAutoSizeVerticalOffset = 2;
			this.RepoNameBox1.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// skillCMDBox1
			// 
			this.skillCMDBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.skillCMDBox1.Bounds = new NxtControl.Drawing.RectF(((float)(360D)), ((float)(133D)), ((float)(192D)), ((float)(25D)));
			this.skillCMDBox1.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.skillCMDBox1.FontScale = true;
			this.skillCMDBox1.Maximum = 100D;
			this.skillCMDBox1.Minimum = 0D;
			this.skillCMDBox1.Name = "skillCMDBox1";
			this.skillCMDBox1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.skillCMDBox1.TextAutoSizeHorizontalOffset = 10;
			this.skillCMDBox1.TextAutoSizeVerticalOffset = 2;
			this.skillCMDBox1.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// inBox1
			// 
			this.inBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.inBox1.Bounds = new NxtControl.Drawing.RectF(((float)(360D)), ((float)(88D)), ((float)(192D)), ((float)(25D)));
			this.inBox1.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.inBox1.FontScale = true;
			this.inBox1.Maximum = 100D;
			this.inBox1.Minimum = 0D;
			this.inBox1.Name = "inBox1";
			this.inBox1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.inBox1.TextAutoSizeHorizontalOffset = 10;
			this.inBox1.TextAutoSizeVerticalOffset = 2;
			this.inBox1.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// currentStateBox1
			// 
			this.currentStateBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.currentStateBox1.Bounds = new NxtControl.Drawing.RectF(((float)(360D)), ((float)(176D)), ((float)(192D)), ((float)(25D)));
			this.currentStateBox1.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.currentStateBox1.FontScale = true;
			this.currentStateBox1.Maximum = 100D;
			this.currentStateBox1.Minimum = 0D;
			this.currentStateBox1.Name = "currentStateBox1";
			this.currentStateBox1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.currentStateBox1.TextAutoSizeHorizontalOffset = 10;
			this.currentStateBox1.TextAutoSizeVerticalOffset = 2;
			this.currentStateBox1.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// outBox1
			// 
			this.outBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.outBox1.Bounds = new NxtControl.Drawing.RectF(((float)(360D)), ((float)(224D)), ((float)(192D)), ((float)(25D)));
			this.outBox1.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.outBox1.FontScale = true;
			this.outBox1.Maximum = 100D;
			this.outBox1.Minimum = 0D;
			this.outBox1.Name = "outBox1";
			this.outBox1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.outBox1.TextAutoSizeHorizontalOffset = 10;
			this.outBox1.TextAutoSizeVerticalOffset = 2;
			this.outBox1.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// messageBox
			// 
			this.messageBox.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.messageBox.Bounds = new NxtControl.Drawing.RectF(((float)(80D)), ((float)(296D)), ((float)(472D)), ((float)(25D)));
			this.messageBox.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.messageBox.FontScale = true;
			this.messageBox.Maximum = 100D;
			this.messageBox.Minimum = 0D;
			this.messageBox.Name = "messageBox";
			this.messageBox.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.messageBox.TextAutoSizeHorizontalOffset = 10;
			this.messageBox.TextAutoSizeVerticalOffset = 2;
			this.messageBox.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// InsertSkillButton
			// 
			this.InsertSkillButton.Bounds = new NxtControl.Drawing.RectF(((float)(128D)), ((float)(232D)), ((float)(100D)), ((float)(25D)));
			this.InsertSkillButton.Brush = new NxtControl.Drawing.Brush("ButtonBrush");
			this.InsertSkillButton.Font = new NxtControl.Drawing.Font("ButtonFont");
			this.InsertSkillButton.InnerBorderColor = new NxtControl.Drawing.Color("ButtonInnerBorderColor");
			this.InsertSkillButton.Name = "InsertSkillButton";
			this.InsertSkillButton.Pen = new NxtControl.Drawing.Pen("ButtonPen");
			this.InsertSkillButton.Radius = 4D;
			this.InsertSkillButton.Text = "ADD SKILL";
			this.InsertSkillButton.TextColor = new NxtControl.Drawing.Color("ButtonTextColor");
			this.InsertSkillButton.TextColorMouseDown = new NxtControl.Drawing.Color("ButtonTextColorMouseDown");
			this.InsertSkillButton.Use3DEffect = false;
			this.InsertSkillButton.Click += new System.EventHandler(this.InsertSkillButtonClick);
			// 
			// EndpointBox1
			// 
			this.EndpointBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
			this.EndpointBox1.Bounds = new NxtControl.Drawing.RectF(((float)(128D)), ((float)(168D)), ((float)(192D)), ((float)(25D)));
			this.EndpointBox1.Font = new NxtControl.Drawing.Font("TextBoxFont");
			this.EndpointBox1.FontScale = true;
			this.EndpointBox1.Maximum = 100D;
			this.EndpointBox1.Minimum = 0D;
			this.EndpointBox1.Name = "EndpointBox1";
			this.EndpointBox1.Pen = new NxtControl.Drawing.Pen("TextBoxPen");
			this.EndpointBox1.TextAutoSizeHorizontalOffset = 10;
			this.EndpointBox1.TextAutoSizeVerticalOffset = 2;
			this.EndpointBox1.TextPadding = new NxtControl.Drawing.Padding(2);
			// 
			// freeText1
			// 
			this.freeText1.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText1.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText1.Location = new NxtControl.Drawing.PointF(56D, 96D);
			this.freeText1.Name = "freeText1";
			this.freeText1.Text = "Skill Name";
			// 
			// freeText2
			// 
			this.freeText2.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText2.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText2.Location = new NxtControl.Drawing.PointF(56D, 136D);
			this.freeText2.Name = "freeText2";
			this.freeText2.Text = "Repo Name";
			// 
			// freeText3
			// 
			this.freeText3.Color = new NxtControl.Drawing.Color("LabelTextColor");
			this.freeText3.Font = new NxtControl.Drawing.Font("LabelFont");
			this.freeText3.Location = new NxtControl.Drawing.PointF(56D, 176D);
			this.freeText3.Name = "freeText3";
			this.freeText3.Text = "Endpoint";
			// 
			// sDefault
			// 
			this.Name = "sDefault";
			this.Shapes.AddRange(new System.ComponentModel.IComponent[] {
			this.rectangle1,
			this.SkillNameBox1,
			this.RepoNameBox1,
			this.skillCMDBox1,
			this.inBox1,
			this.currentStateBox1,
			this.outBox1,
			this.messageBox,
			this.InsertSkillButton,
			this.EndpointBox1,
			this.freeText1,
			this.freeText2,
			this.freeText3});
			this.SymbolSize = new System.Drawing.Size(848, 512);

		}
		private NxtControl.GuiFramework.Rectangle rectangle1;
		private NxtControl.GuiFramework.DrawnTextBox SkillNameBox1;
		private NxtControl.GuiFramework.DrawnTextBox RepoNameBox1;
		private NxtControl.GuiFramework.DrawnTextBox skillCMDBox1;
		private NxtControl.GuiFramework.DrawnTextBox inBox1;
		private NxtControl.GuiFramework.DrawnTextBox currentStateBox1;
		private NxtControl.GuiFramework.DrawnTextBox outBox1;
		private NxtControl.GuiFramework.DrawnTextBox messageBox;
		private NxtControl.GuiFramework.DrawnButton InsertSkillButton;
		private NxtControl.GuiFramework.DrawnTextBox EndpointBox1;
		private NxtControl.GuiFramework.FreeText freeText1;
		private NxtControl.GuiFramework.FreeText freeText2;
		private NxtControl.GuiFramework.FreeText freeText3;
		#endregion
	}
}
